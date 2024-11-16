const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Record attendance for a staff member
 * @param {number} staffId - ID of the staff member (Staff.id)
 * @param {string} fingerprint_data - Fingerprint data for verification
 * @returns {Object} Created attendance record
 */

const recordAttendance = async (staffId, fingerprint_data) => {
  const staff = await db.staff.findUnique({
    where: { userId: staffId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
    },
  });

  if (!staff) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff not found');
  }

  if (staff.fingerprint_data !== fingerprint_data) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid fingerprint data');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAttendance = await db.attendance.findFirst({
    where: {
      staffId: staff.id,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  if (existingAttendance) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Attendance already recorded for today');
  }

  const attendance = await db.attendance.create({
    data: {
      staff: {
        connect: { id: staff.id },
      },
    },
    include: {
      staff: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
          contractor: {
            select: {
              id: true,
              firm_name: true,
            },
          },
        },
      },
    },
  });

  return attendance;
};

/**
 * Get attendance records for a staff member
 * @param {number} staffId - ID of the staff member
 * @param {Date} [startDate] - Start date for filtering records
 * @param {Date} [endDate] - End date for filtering records
 * @returns {Array} Array of attendance records
 */

const getAttendanceRecordsForManagerAndContractors = async (staffId, startDate, endDate) => {
  const whereClause = {
    staffId: staffId,
  };

  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const attendance = await db.attendance.findMany({
    where: whereClause,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      staff: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
          contractor: {
            select: {
              id: true,
              firm_name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return attendance;
};

const getAttendanceRecords = async (staffId, startDate, endDate) => {
  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const attendance = await db.attendance.findMany({
    where: {
      staff: {
        userId: staffId,
      },
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      staff: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
          contractor: {
            select: {
              id: true,
              firm_name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return attendance;
};

const attendanceService = {
  recordAttendance,
  getAttendanceRecords,
  getAttendanceRecordsForManagerAndContractors,
};

module.exports = attendanceService;
