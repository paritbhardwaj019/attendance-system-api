const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Get the next code for a specific module
 * @param {string} moduleType - Type of module (LABOUR, CONTRACTOR, etc.)
 * @returns {Promise<string>} The next code in sequence
 */

const getNextCode = async (moduleType) => {
  const systemCode = await db.$transaction(async (tx) => {
    const current = await tx.systemCode.findUnique({
      where: { moduleType },
    });

    if (!current) {
      throw new ApiError(httpStatus.NOT_FOUND, `No system code configuration found for ${moduleType}`);
    }

    const updated = await tx.systemCode.update({
      where: { moduleType },
      data: { lastNumber: { increment: 1 } },
    });

    return updated;
  });

  const formattedNumber = String(systemCode.lastNumber).padStart(6, '0');
  return `${systemCode.prefix}${formattedNumber}`;
};

const updateSystemCode = async (moduleType, prefix, loggedInUser) => {
  if (!prefix) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prefix is required');
  }

  const existingCode = await db.systemCode.findUnique({
    where: { moduleType },
  });

  if (!existingCode) {
    return db.systemCode.create({
      data: {
        moduleType,
        prefix,
        lastNumber: 0,
        createdBy: { connect: { id: loggedInUser.id } },
        updatedBy: { connect: { id: loggedInUser.id } },
      },
    });
  }

  return db.systemCode.update({
    where: { moduleType },
    data: {
      prefix,
      updatedBy: { connect: { id: loggedInUser.id } },
    },
  });
};

/**
 * Get all system codes
 */
const getAllSystemCodes = async () => {
  return db.systemCode.findMany({
    include: {
      createdBy: {
        select: {
          name: true,
          username: true,
        },
      },
      updatedBy: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });
};

const systemCodeService = {
  getAllSystemCodes,
  getNextCode,
  updateSystemCode,
};

module.exports = systemCodeService;
