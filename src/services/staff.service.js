const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Retrieves the staff's profile.
 * @param {number} staffId - ID of the staff.
 * @returns {Promise<Object>} - Returns the staff's profile.
 * @throws {Error} - Throws an error if staff not found.
 */
const viewProfile = async (staffId) => {
  const staff = await db.staff.findUnique({
    where: { id: staffId },
    include: {
      user: true,
      contractor: {
        include: { user: true },
      },
    },
  });

  if (!staff) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff not found');
  }

  return staff;
};

/**
 * Retrieves attendance records for the staff with optional date range filtering and pagination.
 * @param {number} staffId - ID of the staff.
 * @param {Object} filters - Filters including start_date and end_date.
 * @param {Object} pagination - Pagination options.
 * @returns {Promise<Object>} - Returns a paginated list of attendance records.
 */
const getAttendanceRecords = async (staffId, filters, pagination) => {
  const { page, limit } = pagination;
  const { start_date, end_date } = filters;

  const where = { staffId };

  if (start_date && end_date) {
    where.createdAt = {
      gte: new Date(start_date),
      lte: new Date(end_date),
    };
  } else if (start_date) {
    where.createdAt = {
      gte: new Date(start_date),
    };
  } else if (end_date) {
    where.createdAt = {
      lte: new Date(end_date),
    };
  }

  const attendance = await db.attendance.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  const total = await db.attendance.count({ where });

  return {
    data: attendance,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const staffService = {
  viewProfile,
  getAttendanceRecords,
};

module.exports = staffService;
