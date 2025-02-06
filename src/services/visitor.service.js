const { v4: uuidv4 } = require('uuid');
const db = require('../database/prisma');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const QRCode = require('qrcode');

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
    console.log(error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error generating QR code');
  }
};

/**
 * Register a new visitor
 * @param {Object} visitorData
 * @param {number} userId
 * @returns {Object} Visitor registration details
 */
const registerVisitor = async (visitorData, userId, visitorSignupId = null) => {
  if (!visitorData.name || !visitorData.contact || !visitorData.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required visitor information');
  }

  const existingVisitor = await db.visitor.findUnique({
    where: {
      email: visitorData.email,
    },
  });

  if (existingVisitor) {
    throw new ApiError(httpStatus.CONFLICT, 'Visitor with this email already exists');
  }

  const ticketId = generateTicketId();

  const visitDate = new Date(visitorData.visitDate);
  delete visitorData.visitDate;

  const visitor = await db.visitor.create({
    data: {
      ...visitorData,
      visitDate,
      ticketId,
      status: 'PENDING',
      ...(visitorSignupId && { visitorSignupId }),
      ...(userId && { createdById: userId }),
    },
  });

  const qrCodeUrl = await generateQRCode(ticketId);

  return {
    ticketId: visitor.ticketId,
    qrCodeUrl,
    status: visitor.status,
    visitor,
  };
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

  const existingVisitor = await db.visitor.findUnique({
    where: { ticketId },
  });

  if (!existingVisitor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Visitor not found');
  }

  const visitor = await db.visitor.update({
    where: { ticketId },
    data: {
      status,
      remarks,
      approvedBy: {
        connect: {
          id: userId,
        },
      },
    },
  });

  return {
    ticketId: visitor.ticketId,
    name: visitor.name,
    status: visitor.status,
    remarks: visitor.remarks,
  };
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
    select: {
      ticketId: true,
      name: true,
      contact: true,
      email: true,
      status: true,
      visitPurpose: true,
      visitDate: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return visitors;
};

const visitorService = {
  registerVisitor,
  processVisitorRequest,
  getVisitorStatus,
  listVisitorRequests,
};

module.exports = visitorService;
