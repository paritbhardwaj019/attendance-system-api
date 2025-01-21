const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const cron = require('node-cron');
const logger = require('../config/logger');
const cameraService = require('./camera.service');
// const { getAttendanceRecords } = require('../data/seedData');

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

// const getAttendanceRecords = async (labourId, startDate, endDate) => {
//   if (startDate && endDate) {
//     whereClause.createdAt = {
//       gte: new Date(startDate),
//       lte: new Date(endDate),
//     };
//   }

//   const attendance = await db.attendance.findMany({
//     where: {
//       labour: {
//         userId: labourId,
//       },
//     },
//     select: {
//       id: true,
//       createdAt: true,
//       updatedAt: true,
//       labour: {
//         select: {
//           id: true,
//           user: {
//             select: {
//               id: true,
//               name: true,
//               username: true,
//               role: true,
//             },
//           },
//           contractor: {
//             select: {
//               id: true,
//               firm_name: true,
//             },
//           },
//         },
//       },
//     },
//     orderBy: {
//       createdAt: 'desc',
//     },
//   });

//   return attendance;
// };

const fetchAndStoreAttendance = async () => {
  try {
    const todayStart = new Date().toISOString().split('T')[0];
    const todayEnd = new Date().toISOString().split('T')[0];

    const attendanceData = await cameraService.getAttendanceRecords(todayStart, todayEnd);

    const recordsByDate = attendanceData.data.results;

    console.log('recordsByDate', recordsByDate);

    for (const date in recordsByDate) {
      const records = typeof recordsByDate[date] !== 'object' ? [] : recordsByDate[date];

      for (const record of records) {
        const labour = await db.labour.findUnique({
          where: { employeeNo: record.employeeNo },
        });

        if (!labour) {
          console.error(`Labour with employeeNo ${record.employeeNo} not found.`);
          continue;
        }

        const recordDate = new Date(date);

        await db.attendance.upsert({
          where: {
            labourId_date: {
              labourId: labour.id,
              date: recordDate,
            },
          },
          update: {
            inTime: record.inTime ? record.inTime : null,
            outTime: record.outTime ? record.outTime : null,
            workingHours: parseFloat(record.workingHours),
          },
          create: {
            labour: {
              connect: {
                id: labour.id,
              },
            },
            inTime: record.inTime ? new Date(record.inTime) : null,
            outTime: record.outTime ? new Date(record.outTime) : null,
            workingHours: parseFloat(record.workingHours),
            date: recordDate,
          },
        });
      }
    }

    return {
      success: true,
      message: 'Attendance records stored successfully',
    };
  } catch (error) {
    console.error('Error in fetchAndStoreAttendance:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch and store attendance: ' + error.message);
  }
};

// const formatContractorReport = (records, start, end) => {
//   const contractorData = {};
//   const contractorSummary = {};

//   records.forEach((record) => {
//     if (!record.labour.contractor) return;

//     const contractorId = record.labour.contractor.employeeNo;
//     const date = record.date.toISOString().split('T')[0];

//     if (!contractorData[contractorId]) {
//       contractorData[contractorId] = {
//         contractor_name: record.labour.contractor.user.name,
//         firm_name: record.labour.contractor.firm_name,
//         labours: {},
//       };
//       contractorSummary[contractorId] = {
//         total_hours: 0,
//         total_labours: new Set(),
//         average_hours_per_labour: 0,
//       };
//     }

//     if (!contractorData[contractorId].labours[record.labour.employeeNo]) {
//       contractorData[contractorId].labours[record.labour.employeeNo] = {
//         name: record.labour.user.name,
//         attendance: {},
//       };
//     }

//     contractorData[contractorId].labours[record.labour.employeeNo].attendance[date] = {
//       inTime: record.inTime ? new Date(record.inTime).toLocaleTimeString() : null,
//       outTime: record.outTime ? new Date(record.outTime).toLocaleTimeString() : null,
//       workingHours: parseFloat(record.workingHours),
//     };

//     contractorSummary[contractorId].total_hours += parseFloat(record.workingHours);
//     contractorSummary[contractorId].total_labours.add(record.labour.employeeNo);
//   });

//   Object.keys(contractorSummary).forEach((contractorId) => {
//     const labourCount = contractorSummary[contractorId].total_labours.size;
//     contractorSummary[contractorId].total_labours = labourCount;
//     contractorSummary[contractorId].average_hours_per_labour =
//       labourCount > 0 ? (contractorSummary[contractorId].total_hours / labourCount).toFixed(2) : 0;
//   });

//   return {
//     startDate: start.toISOString().split('T')[0],
//     endDate: end.toISOString().split('T')[0],
//     type: 'contractor',
//     data: contractorData,
//     summary: contractorSummary,
//   };
// };

const getNextExecutionTime = (cronExpression) => {
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
  // getAttendanceRecords,
  getAttendanceRecordsForManagerAndContractors,
  fetchAndStoreAttendance,
  initializeAttendanceCron,
};

module.exports = attendanceService;
