const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const cron = require('node-cron');
const logger = require('../config/logger');
const cameraService = require('./camera.service');

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

const fetchAndStoreAttendance = async () => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const attendanceData = await cameraService.getAttendanceRecords(todayStart, todayEnd);

    const records = attendanceData.data.results;

    for (const record of records) {
      if (record.status === 'PRESENT') {
        await db.attendance.upsert({
          where: {
            labourId_date: {
              labourId: record.id,
              date: todayStart,
            },
          },
          update: {
            inTime: record.inTime ? new Date(record.inTime) : null,
            outTime: record.outTime ? new Date(record.outTime) : null,
            workingHours: parseFloat(record.workingHours),
          },
          create: {
            labour: {
              connect: {
                employeeNo: record.employeeNo,
              },
            },
            inTime: record.inTime ? new Date(record.inTime) : null,
            outTime: record.outTime ? new Date(record.outTime) : null,
            workingHours: parseFloat(record.workingHours),
            date: todayStart,
          },
        });
      }
    }

    return {
      success: true,
      message: 'Attendance records stored successfully',
    };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch and store attendance: ' + error.message);
  }
};

const generateAttendanceReport = async (startDate, endDate, view = 'daily') => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    let attendanceData;

    if (daysDifference <= 3 && view === 'daily') {
      attendanceData = await cameraService.getAttendanceRecords(start, end);
      return formatDailyReport(attendanceData, start, end);
    }

    // Get data from database
    const dbRecords = await db.attendance.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        labour: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            contractor: {
              select: {
                id: true,
                firm_name: true,
                employeeNo: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (view === 'monthly') {
      return formatMonthlyReport(dbRecords, start, end);
    } else if (view === 'contractor') {
      return formatContractorReport(dbRecords, start, end);
    } else {
      return formatDailyReport({ data: { results: dbRecords } }, start, end);
    }
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate attendance report: ' + error.message);
  }
};

const formatDailyReport = (attendanceData, start, end) => {
  const groupedData = {};
  const summary = {};

  Object.entries(attendanceData.data.results).forEach(([date, records]) => {
    groupedData[date] = records.map((record) => ({
      employeeNo: record.employeeNo,
      name: record.name,
      type: record.type,
      role: record.role,
      contractor: record.contractor,
      status: record.status,
      inTime: record.inTime ? new Date(record.inTime).toLocaleTimeString() : null,
      outTime: record.outTime ? new Date(record.outTime).toLocaleTimeString() : null,
      workingHours: record.workingHours,
    }));

    summary[date] = attendanceData.data.summary[date];
  });

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    type: 'daily',
    data: groupedData,
    summary,
  };
};

const formatMonthlyReport = (records, start, end) => {
  const monthlyData = {};
  const monthlySummary = {};

  records.forEach((record) => {
    const date = new Date(record.date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = [];
      monthlySummary[monthYear] = {
        total_hours: 0,
        total_employees: new Set(),
        total_present_days: 0,
      };
    }

    monthlyData[monthYear].push({
      employeeNo: record.labour.employeeNo,
      name: record.labour.user.name,
      date: record.date.toISOString().split('T')[0],
      inTime: record.inTime ? new Date(record.inTime).toLocaleTimeString() : null,
      outTime: record.outTime ? new Date(record.outTime).toLocaleTimeString() : null,
      workingHours: parseFloat(record.workingHours),
    });

    monthlySummary[monthYear].total_hours += parseFloat(record.workingHours);
    monthlySummary[monthYear].total_employees.add(record.labour.employeeNo);
    monthlySummary[monthYear].total_present_days++;
  });

  // Convert Set to size in summary
  Object.keys(monthlySummary).forEach((month) => {
    monthlySummary[month].total_employees = monthlySummary[month].total_employees.size;
  });

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    type: 'monthly',
    data: monthlyData,
    summary: monthlySummary,
  };
};

const formatContractorReport = (records, start, end) => {
  const contractorData = {};
  const contractorSummary = {};

  records.forEach((record) => {
    if (!record.labour.contractor) return;

    const contractorId = record.labour.contractor.employeeNo;
    const date = record.date.toISOString().split('T')[0];

    if (!contractorData[contractorId]) {
      contractorData[contractorId] = {
        contractor_name: record.labour.contractor.user.name,
        firm_name: record.labour.contractor.firm_name,
        labours: {},
      };
      contractorSummary[contractorId] = {
        total_hours: 0,
        total_labours: new Set(),
        average_hours_per_labour: 0,
      };
    }

    if (!contractorData[contractorId].labours[record.labour.employeeNo]) {
      contractorData[contractorId].labours[record.labour.employeeNo] = {
        name: record.labour.user.name,
        attendance: {},
      };
    }

    contractorData[contractorId].labours[record.labour.employeeNo].attendance[date] = {
      inTime: record.inTime ? new Date(record.inTime).toLocaleTimeString() : null,
      outTime: record.outTime ? new Date(record.outTime).toLocaleTimeString() : null,
      workingHours: parseFloat(record.workingHours),
    };

    contractorSummary[contractorId].total_hours += parseFloat(record.workingHours);
    contractorSummary[contractorId].total_labours.add(record.labour.employeeNo);
  });

  // Calculate averages and convert Sets to numbers
  Object.keys(contractorSummary).forEach((contractorId) => {
    const labourCount = contractorSummary[contractorId].total_labours.size;
    contractorSummary[contractorId].total_labours = labourCount;
    contractorSummary[contractorId].average_hours_per_labour =
      labourCount > 0 ? (contractorSummary[contractorId].total_hours / labourCount).toFixed(2) : 0;
  });

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    type: 'contractor',
    data: contractorData,
    summary: contractorSummary,
  };
};
const getNextExecutionTime = (cronExpression) => {
  // Calculate next execution time based on cron expression
  const currentDate = new Date();
  const [hours, , , ,] = cronExpression.split(' ');
  const nextHour = parseInt(hours.replace('*/6', '')) + 6;

  const nextExecution = new Date(currentDate);
  nextExecution.setHours(nextHour, 0, 0, 0);

  if (nextExecution < currentDate) {
    nextExecution.setDate(nextExecution.getDate() + 1);
    nextExecution.setHours(0, 0, 0, 0);
  }

  return nextExecution;
};

const initializeAttendanceCron = () => {
  logger.info('Initializing attendance cron job');
  const cronExpression = '0 */6 * * *';

  const job = cron.schedule(cronExpression, async () => {
    const startTime = new Date();
    logger.info(`Starting attendance cron job at ${startTime.toISOString()}`);

    try {
      logger.info({
        message: 'Fetching and storing attendance records',
        timestamp: startTime,
        cronExpression: cronExpression,
      });

      const result = await fetchAndStoreAttendance();

      const endTime = new Date();
      const executionTime = endTime - startTime;

      logger.info({
        message: 'Attendance cron job completed successfully',
        timestamp: endTime.toISOString(),
        executionTimeMs: executionTime,
        recordsProcessed: result.data?.length || 0,
        status: 'SUCCESS',
      });
    } catch (error) {
      logger.error({
        message: 'Attendance cron job failed',
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code || 'UNKNOWN_ERROR',
        },
        status: 'FAILED',
      });

      console.error('Cron job error:', error);
    }
  });

  const nextExecution = getNextExecutionTime(cronExpression);

  logger.info({
    message: 'Attendance cron job initialized successfully',
    timestamp: new Date().toISOString(),
    cronExpression: cronExpression,
    nextExecutionTime: nextExecution.toISOString(),
  });

  return {
    job,
    getStatus: () => ({
      isRunning: job.running,
      nextExecutionTime: getNextExecutionTime(cronExpression).toISOString(),
      lastRunTime: null,
    }),
  };
};

const attendanceService = {
  recordAttendance,
  getAttendanceRecords,
  getAttendanceRecordsForManagerAndContractors,
  fetchAndStoreAttendance,
  generateAttendanceReport,
  initializeAttendanceCron,
};

module.exports = attendanceService;
