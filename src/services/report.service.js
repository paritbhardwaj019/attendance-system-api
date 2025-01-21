const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const cameraService = require('./camera.service');
const { calculateDaysDifference } = require('../utils/dateUtils');

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

  const today = new Date().toISOString().split('T')[0];
  const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : today;
  const formattedEndDate = endDate ? new Date(endDate).toISOString().split('T')[0] : today;

  const daysDifference = calculateDaysDifference(formattedStartDate, formattedEndDate);

  let attendanceRecords;

  if (daysDifference < 1) {
    const cameraResponse = await cameraService.getAttendanceRecords(formattedStartDate, formattedEndDate);

    attendanceRecords = [];
    for (const date in cameraResponse.data.results) {
      const recordsForDate = cameraResponse.data.results[date];
      for (const record of recordsForDate) {
        attendanceRecords.push({
          labourId: record.id,
          inTime: record.inTime,
          outTime: record.outTime,
          workingHours: parseFloat(record.workingHours || 0),
          date: new Date(date),
          labour: {
            user: {
              name: record.name,
              username: record.employeeNo,
            },
            contractor: {
              firm_name: record.contractor,
              employeeNo: record.employeeNo,
            },
            employeeNo: record.employeeNo,
          },
        });
      }
    }
  } else {
    const whereClause = {
      labourId: labourId ? parseInt(labourId, 10) : undefined,
      labour: contractorId ? { contractorId: parseInt(contractorId, 10) } : undefined,
      date: {
        gte: formattedStartDate ? new Date(formattedStartDate) : undefined,
        lte: formattedEndDate ? new Date(formattedEndDate) : undefined,
      },
    };

    attendanceRecords = await db.attendance.findMany({
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
  }

  const uniqueRecords = [];
  const seenLabourIds = new Set();

  let totalWorkingHours = 0;
  let totalRecordsCount = 0;

  for (const record of attendanceRecords) {
    if (!seenLabourIds.has(record.labourId)) {
      seenLabourIds.add(record.labourId);

      const flattenedRecord = {
        id: record.labourId,
        inTime: record.inTime,
        outTime: record.outTime,
        workingHours: record.workingHours,
        date: record.date,
        name: record.labour.user.name,
        username: record.labour.user.username,
        mobile_number: record.labour.user.mobile_number,
        firm_name: record.labour.contractor.firm_name,
        employeeNo: record.labour.employeeNo,
      };

      uniqueRecords.push(flattenedRecord);

      totalWorkingHours += record.workingHours || 0;
      totalRecordsCount += 1;
    }
  }

  const totalRecords = await db.attendance.count({
    where: {
      labourId: labourId ? parseInt(labourId, 10) : undefined,
      labour: contractorId ? { contractorId: parseInt(contractorId, 10) } : undefined,
      date: {
        gte: formattedStartDate ? new Date(formattedStartDate) : undefined,
        lte: formattedEndDate ? new Date(formattedEndDate) : undefined,
      },
    },
  });

  const summary = {
    totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
    totalRecords: totalRecordsCount,
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'username', headerName: 'Username', width: 150 },
    { field: 'firm_name', headerName: 'Firm Name', width: 150 },
    { field: 'employeeNo', headerName: 'Employee No', width: 150 },
    { field: 'inTime', headerName: 'In Time', width: 150 },
    { field: 'outTime', headerName: 'Out Time', width: 150 },
    { field: 'workingHours', headerName: 'Working Hours', width: 150 },
    { field: 'date', headerName: 'Date', width: 150 },
  ];

  return {
    data: uniqueRecords,
    summary,
    columns,
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

  const today = new Date().toISOString().split('T')[0];
  const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : today;
  const formattedEndDate = endDate ? new Date(endDate).toISOString().split('T')[0] : today;

  const daysDifference = calculateDaysDifference(formattedStartDate, formattedEndDate);

  let attendanceRecords;

  if (daysDifference < 1) {
    const cameraResponse = await cameraService.getAttendanceRecords(formattedStartDate, formattedEndDate);

    const labour = await db.labour.findUnique({
      where: { id: parseInt(labourId, 10) },
      select: { employeeNo: true },
    });

    if (!labour) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Labour not found');
    }

    attendanceRecords = [];
    for (const date in cameraResponse.data.results) {
      const recordsForDate = cameraResponse.data.results[date];
      for (const record of recordsForDate) {
        if (record.employeeNo === labour.employeeNo) {
          attendanceRecords.push({
            labourId: parseInt(labourId, 10),
            inTime: record.inTime,
            outTime: record.outTime,
            workingHours: parseFloat(record.workingHours || 0),
            date: new Date(date),
            labour: {
              user: {
                name: record.name,
                username: record.employeeNo,
              },
              contractor: {
                firm_name: record.contractor,
                employeeNo: record.employeeNo,
              },
              employeeNo: record.employeeNo,
            },
          });
        }
      }
    }
  } else {
    const whereClause = {
      labourId: parseInt(labourId, 10),
      date: {
        gte: formattedStartDate ? new Date(formattedStartDate) : undefined,
        lte: formattedEndDate ? new Date(formattedEndDate) : undefined,
      },
    };

    attendanceRecords = await db.attendance.findMany({
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
  }

  if (!attendanceRecords || attendanceRecords.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No attendance records found for the specified labour');
  }

  let totalWorkingHours = 0;
  let totalRecordsCount = 0;

  for (const record of attendanceRecords) {
    totalWorkingHours += record.workingHours || 0;
    totalRecordsCount += 1;
  }

  const summary = {
    totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
    totalRecords: totalRecordsCount,
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'username', headerName: 'Username', width: 150 },
    { field: 'firm_name', headerName: 'Firm Name', width: 150 },
    { field: 'employeeNo', headerName: 'Employee No', width: 150 },
    { field: 'inTime', headerName: 'In Time', width: 150 },
    { field: 'outTime', headerName: 'Out Time', width: 150 },
    { field: 'workingHours', headerName: 'Working Hours', width: 150 },
    { field: 'date', headerName: 'Date', width: 150 },
  ];

  return {
    data: attendanceRecords,
    summary,
    columns,
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

  const today = new Date().toISOString().split('T')[0];
  const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : today;
  const formattedEndDate = endDate ? new Date(endDate).toISOString().split('T')[0] : today;

  const daysDifference = calculateDaysDifference(formattedStartDate, formattedEndDate);

  let contractorReports;

  if (daysDifference < 1) {
    const cameraResponse = await cameraService.getAttendanceRecords(formattedStartDate, formattedEndDate);

    const contractors = await db.contractor.findMany({
      include: {
        labour: {
          select: {
            id: true,
            employeeNo: true,
          },
        },
      },
    });

    contractorReports = contractors.map((contractor) => {
      let totalWorkingHours = 0;

      for (const date in cameraResponse.data.results) {
        const recordsForDate = cameraResponse.data.results[date];
        for (const record of recordsForDate) {
          if (contractor.labour.some((labour) => labour.employeeNo === record.employeeNo)) {
            totalWorkingHours += parseFloat(record.workingHours || 0);
          }
        }
      }

      return {
        contractorId: contractor.id,
        firmName: contractor.firm_name,
        employeeNo: contractor.employeeNo,
        totalWorkingHours,
        labourCount: contractor.labour.length,
      };
    });
  } else {
    const contractors = await db.contractor.findMany({
      include: {
        labour: {
          include: {
            attendance: {
              where: {
                date: {
                  gte: formattedStartDate ? new Date(formattedStartDate) : undefined,
                  lte: formattedEndDate ? new Date(formattedEndDate) : undefined,
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

    contractorReports = contractors.map((contractor) => {
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
  }

  let totalWorkingHours = 0;
  let totalLabourCount = 0;

  contractorReports.forEach((contractor) => {
    totalWorkingHours += contractor.totalWorkingHours || 0;
    totalLabourCount += contractor.labourCount || 0;
  });

  const summary = {
    totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
    totalLabourCount,
  };

  const columns = [
    { field: 'contractorId', headerName: 'Contractor ID', width: 150 },
    { field: 'firmName', headerName: 'Firm Name', width: 200 },
    { field: 'employeeNo', headerName: 'Employee No', width: 150 },
    { field: 'totalWorkingHours', headerName: 'Total Working Hours', width: 150 },
    { field: 'labourCount', headerName: 'Labour Count', width: 150 },
  ];

  return {
    data: contractorReports,
    summary,
    columns,
  };
};

const reportService = {
  fetchLabourReportHandler,
  fetchLabourReportByIdHandler,
  fetchContractorLabourReportHandler,
};

module.exports = reportService;
