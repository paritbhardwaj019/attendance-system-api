const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Handler to fetch labour attendance report with startDate and endDate filters.
 * @param {Object} filters - Filters for fetching the report.
 * @param {string} [filters.labourId] - ID of the labour to filter by.
 * @param {string} [filters.contractorId] - ID of the contractor to filter by.
 * @param {Date} [filters.startDate] - Start date for filtering attendance records.
 * @param {Date} [filters.endDate] - End date for filtering attendance records.
 * @param {string} [filters.sortBy] - Field to sort by (e.g., 'date', 'inTime', 'outTime').
 * @param {string} [filters.order] - Order of sorting ('asc' or 'desc').
 * @param {number} [filters.page=1] - Page number for pagination.
 * @param {number} [filters.limit=10] - Number of records per page.
 * @returns {Object} Labour attendance report with pagination details.
 */
const fetchLabourReportHandler = async (filters = {}) => {
  let { labourId, contractorId, startDate, endDate, sortBy = 'date', order = 'desc', page = 1, limit = 10 } = filters;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  const sortableFields = ['date', 'inTime', 'outTime', 'workingHours'];
  const sortField = sortableFields.includes(sortBy) ? sortBy : 'date';

  const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;
  const take = limit;

  const whereClause = {
    labourId: labourId ? parseInt(labourId, 10) : undefined,
    labour: contractorId ? { contractorId: parseInt(contractorId, 10) } : undefined,
    date: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    },
  };

  const attendanceRecords = await db.attendance.findMany({
    where: whereClause,
    include: {
      labour: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              mobile_number: true,
            },
          },
          contractor: {
            select: {
              id: true,
              firm_name: true,
              employeeNo: true,
            },
          },
        },
      },
    },
    orderBy: {
      [sortField]: sortOrder,
    },
    skip: skip,
    take: take,
  });

  const totalRecords = await db.attendance.count({
    where: whereClause,
  });

  return {
    data: attendanceRecords,
    pagination: {
      total: totalRecords,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalRecords / limit),
    },
  };
};

/**
 * Handler to fetch detailed labour report by labour ID.
 * @param {number} labourId - ID of the labour to fetch the report for.
 * @param {Object} filters - Filters for fetching the report.
 * @param {Date} [filters.startDate] - Start date for filtering attendance records.
 * @param {Date} [filters.endDate] - End date for filtering attendance records.
 * @returns {Object} Detailed labour report.
 */
const fetchLabourReportByIdHandler = async (labourId, filters = {}) => {
  const { startDate, endDate } = filters;

  console.log('LABOUR ID', labourId);
  console.log('FILTERS', filters);

  const whereClause = {
    labourId: parseInt(labourId, 10),
    date: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    },
  };

  console.log('ALL ATTENDANCE', await db.attendance.findMany());

  const attendanceRecords = await db.attendance.findMany({
    where: whereClause,
    include: {
      labour: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              mobile_number: true,
            },
          },
          contractor: {
            select: {
              id: true,
              firm_name: true,
              employeeNo: true,
            },
          },
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  if (!attendanceRecords || attendanceRecords.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No attendance records found for the specified labour');
  }

  return {
    data: attendanceRecords,
  };
};

/**
 * Handler to fetch contractor-wise labour working hours report.
 * @param {Object} filters - Filters for fetching the report.
 * @param {Date} [filters.startDate] - Start date for filtering attendance records.
 * @param {Date} [filters.endDate] - End date for filtering attendance records.
 * @returns {Object} Contractor-wise labour working hours report.
 */
const fetchContractorLabourReportHandler = async (filters = {}) => {
  const { startDate, endDate } = filters;

  const contractors = await db.contractor.findMany({
    include: {
      labour: {
        include: {
          attendance: {
            where: {
              date: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
              },
            },
            select: {
              workingHours: true,
            },
          },
        },
      },
    },
  });

  const contractorReports = contractors.map((contractor) => {
    let totalWorkingHours = 0;

    contractor.labour.forEach((labour) => {
      labour.attendance.forEach((attendance) => {
        totalWorkingHours += attendance.workingHours || 0;
      });
    });

    return {
      contractorId: contractor.id,
      firmName: contractor.firm_name,
      employeeNo: contractor.employeeNo,
      totalWorkingHours,
      labourCount: contractor.labour.length,
    };
  });

  return {
    data: contractorReports,
  };
};

const reportService = {
  fetchLabourReportHandler,
  fetchLabourReportByIdHandler,
  fetchContractorLabourReportHandler,
};

module.exports = reportService;
