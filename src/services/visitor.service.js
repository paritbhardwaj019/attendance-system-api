const { v4: uuidv4 } = require('uuid');
const db = require('../database/prisma');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const QRCode = require('qrcode');
const { uploadMultipleFilesToS3 } = require('./s3.service');

/**
 * Generate unique ticket ID
 * @returns {string} Unique ticket ID
 */
const generateTicketId = () => {
  return `VIS-${uuidv4().slice(0, 8).toUpperCase()}`;
};

/**
 * Generate QR Code URL
 * @param {string} ticketId
 * @returns {Promise<string>} QR Code data URL
 */
const generateQRCode = async (ticketId) => {
  try {
    return await QRCode.toDataURL(`${config.frontendUrl}/visitor/status/${ticketId}`);
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error generating QR code');
  }
};

const registerVisitor = async (visitorData, userId, visitorSignupId = null, files) => {
  if (!visitorData.name || !visitorData.contact) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Name and contact are required');
  }

  if (visitorData.plantId) {
    const plant = await db.plant.findUnique({
      where: { id: visitorData.plantId },
      include: {
        members: true,
        headUser: true,
      },
    });

    if (!plant) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Plant not found');
    }
  }

  const ticketId = generateTicketId();
  const startDate = visitorData.startDate ? new Date(visitorData.startDate) : null;
  delete visitorData.startDate;

  let photoUrls = [];

  if (files && files.photos && files.photos.length > 0) {
    photoUrls = await uploadMultipleFilesToS3(files.photos, 'visitor-photos');
  }

  const visitor = await db.$transaction(async (tx) => {
    const visitorRecord = await tx.visitor.create({
      data: {
        name: visitorData.name,
        contact: visitorData.contact,
        email: visitorData.email,
        visitPurpose: visitorData.visitPurpose,
        companyName: visitorData.companyName,
        plantId: visitorData.plantId || null,
        meetingWith: visitorData.meetingWith,
        startDate,
        ticketId,
        status: 'PENDING',
        ...(visitorSignupId && { visitorSignupId }),
        ...(userId && { createdById: userId }),
      },
      include: {
        plant: {
          select: {
            name: true,
            code: true,
            plantHead: true,
            members: {
              include: {
                user: {
                  select: {
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (photoUrls.length > 0) {
      await tx.visitorPhoto.createMany({
        data: photoUrls.map((url) => ({
          url,
          visitorId: visitorRecord.id,
        })),
      });
    }

    return visitorRecord;
  });

  const qrCodeUrl = await generateQRCode(ticketId);

  const response = {
    ticketId: visitor.ticketId,
    qrCodeUrl,
    status: visitor.status,
    visitor: {
      ...visitor,
      plant: visitor.plant
        ? {
            name: visitor.plant.name,
            code: visitor.plant.code,
            plantHead: visitor.plant.plantHead,
            approvers: visitor.plant.members
              .filter((member) => member.user.role.name === 'MANAGER' || member.hasAllAccess)
              .map((member) => ({
                name: member.user.name,
                role: member.user.role.name,
              })),
          }
        : null,
    },
  };

  return response;
};

/**
 * Approve or reject visitor request
 * @param {string} ticketId
 * @param {string} status
 * @param {string} remarks
 * @param {number} userId
 * @returns {Object} Updated visitor details
 */

const processVisitorRequest = async (ticketId, status, remarks, userId) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid status');
  }

  const visitor = await db.visitor.update({
    where: { ticketId },
    data: {
      status,
      remarks,
      approvedById: userId,
    },
    include: {
      plant: true,
    },
  });

  if (!visitor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Visitor not found');
  }

  return visitor;
};

/**
 * Get visitor status
 * @param {string} identifier
 * @returns {Object} Visitor status details
 */
const getVisitorStatus = async (identifier) => {
  const visitor = await db.visitor.findFirst({
    where: {
      OR: [{ ticketId: identifier }, { name: { contains: identifier } }],
    },
  });

  if (!visitor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Visitor not found');
  }

  return {
    ticketId: visitor.ticketId,
    name: visitor.name,
    status: visitor.status,
    remarks: visitor.remarks,
    visitPurpose: visitor.visitPurpose,
    visitDate: visitor.visitDate,
  };
};

/**
 * List visitor requests with optional filtering
 * @param {Object} filters - Filtering options
 * @param {string} [filters.status] - Status of visitor requests
 * @param {string} [filters.startDate] - Start date for filtering
 * @param {string} [filters.endDate] - End date for filtering
 * @param {number} [filters.createdById] - User ID who created the request
 * @param {number} [filters.visitorSignupId] - Visitor signup ID
 * @returns {Array} List of visitor requests
 */
const listVisitorRequests = async (filters = {}) => {
  const { status, startDate, endDate, createdById, visitorSignupId } = filters;

  const whereClause = {};

  if (status) {
    whereClause.status = status;
  }

  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (visitorSignupId) {
    whereClause.visitorSignupId = visitorSignupId;
  } else if (createdById) {
    whereClause.createdById = createdById;
  }

  const visitors = await db.visitor.findMany({
    where: whereClause,
    include: {
      photos: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return visitors;
};

const handleVisitorEntry = async (ticketId) => {
  const visitor = await db.visitor.findUnique({
    where: { ticketId },
    include: {
      entries: {
        where: {
          dateOfVisit: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      },
    },
  });

  if (!visitor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Visitor not found');
  }

  if (visitor.status !== 'APPROVED') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only approved visitors can enter/exit the premises');
  }

  const today = new Date();
  const visitDate = new Date(visitor.startDate);

  if (
    visitDate.getDate() !== today.getDate() ||
    visitDate.getMonth() !== today.getMonth() ||
    visitDate.getFullYear() !== today.getFullYear()
  ) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Entry/exit is only allowed on the scheduled visit date');
  }

  let entry = visitor.entries[0];

  if (!entry) {
    entry = await db.visitorEntry.create({
      data: {
        visitorId: visitor.id,
        plantId: visitor.plantId,
        dateOfVisit: new Date(),
      },
    });
  }

  const isExit = entry.entryTime && !entry.exitTime;

  if (entry.exitTime) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Visitor has already completed their visit for today');
  }

  const updatedEntry = await db.visitorEntry.update({
    where: { id: entry.id },
    data: isExit ? { exitTime: new Date() } : { entryTime: new Date() },
  });

  return {
    action: isExit ? 'EXIT' : 'ENTRY',
    time: isExit ? updatedEntry.exitTime : updatedEntry.entryTime,
    visitor: visitor.name,
    ticketId: visitor.ticketId,
  };
};

const getVisitorRecords = async (startDate, endDate, plantId) => {
  const where = {
    dateOfVisit: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  if (plantId) {
    where.plantId = plantId;
  }

  return db.visitorEntry.findMany({
    where,
    include: {
      visitor: true,
      plant: true,
    },
    orderBy: { dateOfVisit: 'desc' },
  });
};

const visitorService = {
  registerVisitor,
  processVisitorRequest,
  getVisitorStatus,
  listVisitorRequests,
  handleVisitorEntry,
  getVisitorRecords,
};

module.exports = visitorService;
