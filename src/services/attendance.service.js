const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Records attendance for a staff member using fingerprint data.
 * @param {number} managerId - ID of the manager recording the attendance.
 * @param {Object} data - Attendance data including staff_id, fingerprint_data, and timestamp.
 * @returns {Promise<Object>} - Returns the recorded attendance.
 * @throws {Error} - Throws an error if staff not found or fingerprint mismatch.
 */
const recordAttendance = async (managerId, data) => {
  const { staff_id, fingerprint_data, timestamp } = data;

  // Verify the staff belongs to a contractor under this manager
  const staff = await db.staff.findUnique({
    where: { id: staff_id },
    include: { contractor: true },
  });

  if (!staff) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff not found');
  }

  const contractor = await db.contractor.findUnique({
    where: { id: staff.contractorId },
  });

  if (!contractor || contractor.managerId !== managerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Staff does not belong to this manager');
  }

  // Verify fingerprint data matches
  if (staff.fingerprint_data !== fingerprint_data) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid fingerprint data');
  }

  // Record attendance
  const attendance = await db.attendance.create({
    data: {
      staffId: staff_id,
      createdAt: timestamp ? new Date(timestamp) : new Date(),
    },
  });

  return attendance;
};

/**
 * Retrieves attendance records for a staff member with optional date range filtering and pagination.
 * @param {number} requesterId - ID of the requester.
 * @param {string} requesterRole - Role of the requester.
 * @param {number} staffId - ID of the staff.
 * @param {Object} filters - Filters including start_date and end_date.
 * @param {Object} pagination - Pagination options.
 * @returns {Promise<Object>} - Returns a paginated list of attendance records.
 * @throws {Error} - Throws an error if unauthorized access.
 */
const getAttendanceRecord = async (requesterId, requesterRole, staffId, filters, pagination) => {
  // If requester is Staff, ensure they can only access their own records
  if (requesterRole === 'Staff' && requesterId !== staffId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot access other staff attendance records');
  }

  // If requester is Contractor, ensure the staff belongs to their contractors
  if (requesterRole === 'Contractor') {
    const contractor = await db.contractor.findUnique({
      where: { userId: requesterId },
    });

    if (!contractor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
    }

    const staff = await db.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff || staff.contractorId !== contractor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Cannot access staff from other contractors');
    }
  }

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

const attendanceService = {
  recordAttendance,
  getAttendanceRecord,
};

module.exports = attendanceService;
