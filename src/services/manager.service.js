const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/utils');
const { ROLES } = require('../config/roles');
const { uploadFileToS3, uploadMultipleFilesToS3 } = require('./s3.service');

/**
 * Adds a new contractor with multiple photos and PDFs.
 * @param {Number} managerUserId - The user ID of the manager.
 * @param {Object} contractorData - The contractor's data.
 * @param {Object} files - The uploaded files (photos and PDFs).
 * @returns {Object} - The created contractor object.
 * @throws {ApiError} - Throws ApiError for known error scenarios.
 */
const addContractorHandler = async (managerUserId, contractorData, files) => {
  if (!managerUserId || !contractorData || !contractorData.name || !contractorData.username || !contractorData.password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required fields');
  }

  const manager = await db.manager.findUnique({
    where: { userId: managerUserId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: true,
        },
      },
    },
  });

  if (!manager) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Manager not found');
  }

  const [photoUrls, pdfUrls] = await Promise.all([
    uploadMultipleFilesToS3(files.photos, 'contractor-photos'),
    uploadMultipleFilesToS3(files.pdfs, 'contractor-pdfs'),
  ]);

  const contractor = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: contractorData.name,
        username: contractorData.username,
        password: await hashPassword(contractorData.password),
        mobile_number: contractorData.mobile_number,
        role: {
          connect: { name: ROLES.CONTRACTOR },
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        mobile_number: true,
        role: true,
      },
    });

    const contractorRecord = await tx.contractor.create({
      data: {
        user: { connect: { id: user.id } },
        firm_name: contractorData.firm_name,
        manager: { connect: { id: manager.id } },
        aadhar_number: contractorData.aadhar_number,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            mobile_number: true,
            role: true,
          },
        },
        manager: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (photoUrls.length > 0) {
      const photoRecords = photoUrls.map((url) => ({
        url,
        contractorId: contractorRecord.id,
      }));
      await tx.contractorPhoto.createMany({
        data: photoRecords,
      });
    }

    if (pdfUrls.length > 0) {
      const pdfRecords = pdfUrls.map((url) => ({
        url,
        contractorId: contractorRecord.id,
      }));
      await tx.contractorPDF.createMany({
        data: pdfRecords,
      });
    }

    const completeContractor = await tx.contractor.findUnique({
      where: { id: contractorRecord.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            mobile_number: true,
            role: true,
          },
        },
        manager: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        photos: true,
        pdfs: true,
      },
    });

    return completeContractor;
  });

  const { password, ...safeUser } = contractor.user;
  delete contractor.managerId;

  return {
    ...contractor,
    user: safeUser,
  };
};

/**
 * Handler to fetch multiple contractors with filters, sorting, and pagination.
 * @param {Object} filters - Filters for fetching contractors.
 * @param {string} [filters.search] - Search term to search across name, username, and mobile_number.
 * @param {string} [filters.sortBy] - Field to sort by (e.g., 'name', 'username', 'createdAt').
 * @param {string} [filters.order] - Order of sorting ('asc' or 'desc').
 * @param {number} [filters.page=1] - Page number for pagination.
 * @param {number} [filters.limit=10] - Number of contractors per page.
 * @returns {Object} Object containing contractor data and pagination info.
 */

const fetchContractorsHandler = async (filters = {}, loggedInUser) => {
  let { search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = filters;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  const sortableFields = ['name', 'username', 'createdAt', 'updatedAt'];
  const sortField = sortableFields.includes(sortBy) ? sortBy : 'createdAt';

  const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;
  const take = limit;

  const whereClause = {
    manager: {
      user: {
        id: loggedInUser.id,
      },
    },
    OR: search
      ? [
          { user: { name: { contains: search } } },
          { user: { username: { contains: search } } },
          { user: { mobile_number: { contains: search } } },
        ]
      : undefined,
  };

  const contractors = await db.contractor.findMany({
    where: whereClause,
    select: {
      id: true,
      firm_name: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      manager: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      [sortField]: sortOrder,
    },
    skip: skip,
    take: take,
  });

  const totalContractors = await db.contractor.count({
    where: whereClause,
  });

  return {
    data: contractors,
    pagination: {
      total: totalContractors,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalContractors / limit),
    },
  };
};

/**
 * Handler to add labour members under a specific contractor.
 * @param {number} loggedInUser - The User ID of the Manager.
 * @param {Object} data - Data for the new Labour member.
 * @returns {Object} The created Labour object without sensitive fields.
 */

const addLabourHandler = async (contractorId, labourData, files) => {
  if (
    !contractorId ||
    !labourData ||
    !labourData.name ||
    !labourData.username ||
    !labourData.password ||
    !labourData.aadhar_number
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required fields');
  }

  if (files.pdfs && files.pdfs.length > 2) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You can upload up to 2 PDF documents');
  }

  const contractor = await db.contractor.findUnique({
    where: { id: contractorId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: true,
        },
      },
    },
  });

  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
  }

  const [photoUrls, pdfUrls] = await Promise.all([
    uploadMultipleFilesToS3(files.photos, 'labour-photos'),
    uploadMultipleFilesToS3(files.pdfs, 'labour-pdfs'),
  ]);

  const labour = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: labourData.name,
        username: labourData.username,
        password: await hashPassword(labourData.password),
        mobile_number: labourData.mobile_number,
        role: {
          connect: { name: ROLES.LABOUR },
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        mobile_number: true,
        role: true,
      },
    });

    const labourRecord = await tx.labour.create({
      data: {
        user: { connect: { id: user.id } },
        fingerprint_data: labourData.fingerprint_data,
        contractor: { connect: { id: contractor.id } },
        aadhar_number: labourData.aadhar_number,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            mobile_number: true,
            role: true,
          },
        },
        contractor: {
          select: {
            id: true,
            firm_name: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (photoUrls.length > 0) {
      const photoRecords = photoUrls.map((url) => ({
        url,
        labourId: labourRecord.id,
      }));
      await tx.labourPhoto.createMany({
        data: photoRecords,
      });
    }

    if (pdfUrls.length > 0) {
      const pdfRecords = pdfUrls.map((url) => ({
        url,
        labourId: labourRecord.id,
      }));
      await tx.labourPDF.createMany({
        data: pdfRecords,
      });
    }

    const completeLabour = await tx.labour.findUnique({
      where: { id: labourRecord.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            mobile_number: true,
            role: true,
          },
        },
        contractor: {
          select: {
            id: true,
            firm_name: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        photos: true,
        pdfs: true,
      },
    });

    return completeLabour;
  });

  const { password, ...safeUser } = labour.user;
  delete labour.contractorId;

  return {
    ...labour,
    user: safeUser,
  };
};

/**
 * Handler to fetch labour members for a specific contractor with filters, sorting, and pagination.
 * @param {number} managerUserId - The User ID of the Manager.
 * @param {number} contractorId - The ID of the Contractor.
 * @param {Object} filters - Filters for fetching labour.
 * @param {string} [filters.search] - Search term to search across name, username, and mobile_number.
 * @param {string} [filters.sortBy] - Field to sort by (e.g., 'name', 'username', 'createdAt').
 * @param {string} [filters.order] - Order of sorting ('asc' or 'desc').
 * @param {number} [filters.page=1] - Page number for pagination.
 * @param {number} [filters.limit=10] - Number of labour members per page.
 * @returns {Object} Object containing labour data and pagination info.
 */

const getContractorLabour = async (loggedInUser, contractorId, filters = {}) => {
  let { search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = filters;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  const sortableFields = ['name', 'username', 'designation', 'department', 'createdAt', 'updatedAt'];
  const sortField = sortableFields.includes(sortBy) ? sortBy : 'createdAt';

  const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;
  const take = limit;

  const manager = await db.manager.findUnique({
    where: {
      userId: loggedInUser.id,
    },
  });

  if (!manager) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Manager not found');
  }

  const contractor = await db.contractor.findFirst({
    where: {
      id: parseInt(contractorId, 10),
      managerId: manager.id,
    },
  });

  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found or does not belong to this manager');
  }

  const whereClause = {
    contractorId: contractor.id,
    OR: search
      ? [
          { user: { name: { contains: search } } },
          { user: { username: { contains: search } } },
          { user: { mobile_number: { contains: search } } },
        ]
      : undefined,
  };

  const labour = await db.labour.findMany({
    where: whereClause,
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      contractor: {
        select: {
          id: true,
          firm_name: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
      fingerprint_data: true,
      attendance: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy:
      sortField === 'name' || sortField === 'username'
        ? {
            user: {
              [sortField]: sortOrder,
            },
          }
        : {
            [sortField]: sortOrder,
          },
    skip: skip,
    take: take,
  });

  const totalLabour = await db.labour.count({
    where: whereClause,
  });

  return {
    data: labour,
    pagination: {
      total: totalLabour,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalLabour / limit),
    },
  };
};

const managerService = { addContractorHandler, fetchContractorsHandler, addLabourHandler, getContractorLabour };

module.exports = managerService;
