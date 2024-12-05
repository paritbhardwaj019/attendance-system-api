const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Record attendance for a labour member
 * @param {number} labourId - ID of the labour member (Staff.id)
 * @param {string} fingerprint_data - Fingerprint data for verification
 * @returns {Object} Created attendance record
 */

const recordAttendance = async (labourId, fingerprint_data) => {
  const labour = await db.labour.findUnique({
    where: { userId: labourId },
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

  if (!labour) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff not found');
  }

  if (labour.fingerprint_data !== fingerprint_data) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid fingerprint data');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAttendance = await db.attendance.findFirst({
    where: {
      labourId: labour.id,
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
      labour: {
        connect: { id: labour.id },
      },
    },
    include: {
      labour: {
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
 * Get attendance records for a labour member
 * @param {number} labourId - ID of the labour member
 * @param {Date} [startDate] - Start date for filtering records
 * @param {Date} [endDate] - End date for filtering records
 * @returns {Array} Array of attendance records
 */

const getAttendanceRecordsForManagerAndContractors = async (labourId, startDate, endDate) => {
  const whereClause = {
    labourId: labourId,
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
      labour: {
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

const getAttendanceRecords = async (labourId, startDate, endDate) => {
  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const attendance = await db.attendance.findMany({
    where: {
      labour: {
        userId: labourId,
      },
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      labour: {
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
