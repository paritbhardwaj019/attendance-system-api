const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Retrieves the contractor's profile along with assigned staff.
 * @param {number} contractorId - ID of the contractor.
 * @returns {Promise<Object>} - Returns the contractor's profile and staff.
 * @throws {Error} - Throws an error if contractor not found.
 */
const viewProfile = async (contractorId) => {
  const contractor = await db.contractor.findUnique({
    where: { id: contractorId },
    include: {
      user: true,
      staff: {
        include: { user: true },
      },
    },
  });

  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
  }

  return contractor;
};

const contractorService = {
  viewProfile,
};

module.exports = contractorService;
