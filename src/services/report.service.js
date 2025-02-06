const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const cameraService = require('./camera.service');
const { calculateDaysDifference } = require('../utils/dateUtils');
const timeUtils = require('../utils/timeUtils');

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

  const isToday = formattedStartDate === today;

  console.log('isToday', isToday);

  let attendanceRecords;

  if (isToday) {
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
          name: record.name || 'Unknown',
          contractorId: record.contractorId || null,
          contractorName: record.contractor || 'Unknown',
        });
      }
    }
  } else {
    console.log(formattedEndDate, formattedStartDate);

    const startDateTime = new Date(formattedStartDate);
    const endDateTime = new Date(formattedEndDate);
    endDateTime.setHours(23, 59, 59, 999);

    const whereClause = {
      labourId: labourId ? parseInt(labourId, 10) : undefined,
      labour: contractorId ? { contractorId: parseInt(contractorId, 10) } : undefined,
      date: {
        gte: startDateTime,
        lte: endDateTime,
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
              include: {
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
        [sortField]: sortOrder,
      },
      skip: skip,
      take: take,
    });

    attendanceRecords = attendanceRecords.map((record) => ({
      id: record.id,
      labourId: record.labourId,
      inTime: record.inTime,
      outTime: record.outTime,
      workingHours: record.workingHours,
      date: record.date,
      name: record.labour.user.name,
      contractorId: record.labour.contractor.id,
      contractorName: record.labour.contractor.user.name,
    }));
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
        name: record.name,
        contractorId: record.contractorId,
        contractorName: record.contractorName,
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
    { field: 'contractorId', headerName: 'Contractor ID', width: 150 },
    { field: 'contractorName', headerName: 'Contractor Name', width: 150 },
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

  const isToday = formattedStartDate === today;

  let attendanceRecords;

  if (isToday) {
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
    const startDateTime = new Date(formattedStartDate);
    const endDateTime = new Date(formattedEndDate);
    endDateTime.setHours(23, 59, 59, 999);

    const whereClause = {
      labourId: parseInt(labourId, 10),
      date: {
        gte: startDateTime,
        lte: endDateTime,
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

  const isToday = formattedStartDate === today;

  let contractorReports;

  if (isToday) {
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
    const startDateTime = new Date(formattedStartDate);
    const endDateTime = new Date(formattedEndDate);
    endDateTime.setHours(23, 59, 59, 999);

    const contractors = await db.contractor.findMany({
      include: {
        labour: {
          include: {
            attendance: {
              where: {
                date: {
                  gte: startDateTime,
                  lte: endDateTime,
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

const fetchDailyReportHandler = async (filters) => {
  try {
    const { startDate, contractorId } = filters;
    const queryDate = timeUtils.formatToIST(startDate);
    const queryDateString = timeUtils.formatDateOnly(queryDate);

    // For database queries
    const dayStart = timeUtils.getStartOfDay(queryDate);
    const dayEnd = timeUtils.getEndOfDay(queryDate);

    // Get all labours with their contractor info
    const labours = await db.labour.findMany({
      where: contractorId ? {
        contractorId: parseInt(contractorId, 10)
      } : {},
      include: {
        user: {
          select: {
            name: true,
          },
        },
        contractor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Get attendance records for the specified date
    const attendanceRecords = await db.attendance.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        ...(contractorId && {
          labour: {
            contractorId: parseInt(contractorId, 10),
          },
        }),
      },
    });

    // Create attendance map for quick lookup
    const attendanceMap = new Map(
      attendanceRecords.map(record => [record.labourId, record])
    );

    // Process each labour and their attendance
    const processedRecords = labours.map(labour => {
      const attendanceRecord = attendanceMap.get(labour.id);
      
      // Calculate working hours if attendance exists
      let workingHours = 0;
      if (attendanceRecord?.inTime && attendanceRecord?.outTime) {
        workingHours = (new Date(attendanceRecord.outTime) - new Date(attendanceRecord.inTime)) / (1000 * 60 * 60);
      }

      return {
        labourId: labour.id,
        employeeNo: labour.employeeNo,
        name: labour.user.name,
        contractorId: labour.contractor?.id || '-',
        contractorName: labour.contractor?.user?.name || '',
        inTime: timeUtils.formatTimeOnly(attendanceRecord?.inTime) || null,
        outTime: timeUtils.formatTimeOnly(attendanceRecord?.outTime) || null,
        hours: parseFloat(workingHours.toFixed(2)),
        date: queryDateString,
      };
    });

    // Calculate summary
    const summary = processedRecords.reduce(
      (acc, record) => ({
        totalHours: acc.totalHours + (record.hours || 0),
        totalLabours: acc.totalLabours + 1,
        presentCount: acc.presentCount + (record.inTime ? 1 : 0),
        absentCount: acc.absentCount + (record.inTime ? 0 : 1),
      }),
      { totalHours: 0, totalLabours: 0, presentCount: 0, absentCount: 0 }
    );
    return {
      summary: {
        totalHours: parseFloat(summary.totalHours.toFixed(2)).toString(),
        totalLabours: summary.totalLabours,
        totalRecords: processedRecords.length,
      },
      data: processedRecords,
      columns: [
        { field: 'labourId', headerName: 'Labour ID', width: 100 },
        { field: 'employeeNo', headerName: 'Employee No', width: 150 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'contractorId', headerName: 'Contractor ID', width: 150 },
        { field: 'contractorName', headerName: 'Contractor Name', width: 150 },
        { field: 'inTime', headerName: 'In Time', width: 150 },
        { field: 'outTime', headerName: 'Out Time', width: 150 },
        { field: 'hours', headerName: 'Hours', width: 150 },
        { field: 'date', headerName: 'Date', width: 150 },
      ],
    };
  } catch (error) {
    console.error('Error in fetchDailyReportHandler:', error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to fetch daily report: ' + error.message
    );
  }
};

const fetchCustomReportHandler = async (filters) => {
  try {
    const { startDate, endDate, contractorId } = filters;
    
    if (!startDate || !endDate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Both startDate and endDate are required');
    }

    const startDateTime = new Date(startDate + 'T00:00:00Z');
    const endDateTime = new Date(endDate + 'T23:59:59Z');

    // Get all labours with their contractor info
    const labours = await db.labour.findMany({
      where: contractorId ? {
        contractorId: parseInt(contractorId, 10)
      } : {},
      include: {
        user: {
          select: {
            name: true,
          },
        },
        contractor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Get attendance records for the date range
    const attendanceRecords = await db.attendance.findMany({
      where: {
        date: {
          gte: startDateTime,
          lte: endDateTime,
        },
        ...(contractorId && {
          labour: {
            contractorId: parseInt(contractorId, 10),
          },
        }),
      },
    });

    // Create attendance map for quick lookup, grouped by date and labourId
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const dateString = record.date.toISOString().split('T')[0];
      if (!attendanceMap.has(dateString)) {
        attendanceMap.set(dateString, new Map());
      }
      attendanceMap.get(dateString).set(record.labourId, record);
    });

    // Generate array of dates in the range
    const dateRange = [];
    let currentDate = new Date(startDateTime);
    while (currentDate <= endDateTime) {
      dateRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process each labour for each date
    const processedRecords = [];
    labours.forEach(labour => {
      dateRange.forEach(date => {
        const attendanceRecord = attendanceMap.get(date)?.get(labour.id);
        
        // Calculate working hours if attendance exists
        let workingHours = 0;
        if (attendanceRecord?.inTime && attendanceRecord?.outTime) {
          workingHours = (new Date(attendanceRecord.outTime) - new Date(attendanceRecord.inTime)) / (1000 * 60 * 60);
        }

        processedRecords.push({
          labourId: labour.id,
          employeeNo: labour.employeeNo,
          name: labour.user.name,
          contractorId: labour.contractor?.id || 0,
          contractorName: labour.contractor?.user?.name || '',
          inTime: timeUtils.formatTimeOnly(attendanceRecord?.inTime) || null,
          outTime: timeUtils.formatTimeOnly(attendanceRecord?.outTime) || null,
          hours: parseFloat(workingHours.toFixed(2)),
          date: date,
        });
      });
    });

    // Calculate summary
  
    const summary = processedRecords.reduce(
      (acc, record) => ({
        totalHours: acc.totalHours + (record.hours || 0),
        totalLabours: acc.totalLabours + (record.date === dateRange[0] ? 1 : 0), // Count unique labours only once
        presentCount: acc.presentCount + (record.inTime ? 1 : 0),
        absentCount: acc.absentCount + (record.inTime ? 0 : 1),
        totalDays: dateRange.length
      }),
      { totalHours: 0, totalLabours: 0, presentCount: 0, absentCount: 0, totalDays: 0 }
    );

    return {
      summary: {
        totalHours: parseFloat(summary.totalHours.toFixed(2)).toString(),
        totalLabours: summary.totalLabours,
        totalRecords: processedRecords.length,
        totalDays: summary.totalDays,
        averageHoursPerDay: parseFloat((summary.totalHours / summary.totalDays).toFixed(2)),
      },
      data: processedRecords,
      columns: [
        { field: 'labourId', headerName: 'Labour ID', width: 100 },
        { field: 'employeeNo', headerName: 'Employee No', width: 150 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'contractorId', headerName: 'Contractor ID', width: 150 },
        { field: 'contractorName', headerName: 'Contractor Name', width: 150 },
        { field: 'inTime', headerName: 'In Time', width: 150 },
        { field: 'outTime', headerName: 'Out Time', width: 150 },
        { field: 'hours', headerName: 'Hours', width: 150 },
        { field: 'date', headerName: 'Date', width: 150 },
      ],
    };

  } catch (error) {
    console.error('Error in fetchCustomReportHandler:', error);
    throw new ApiError(
      error.statusCode || httpStatus.BAD_REQUEST,
      'Failed to fetch custom report: ' + error.message
    );
  }
};

const fetchContractorReport = async (filters) => {
  const { startDate, endDate, contractorId} = filters;
  const report = await fetchDailyReportHandler({ startDate, endDate, contractorId });
  return report;
};

const fetchContractorDailyReport = async (filters) => {
  const { startDate, contractorId } = filters;
  const report = await fetchDailyReportHandler({ startDate, contractorId });

  // Fetch all contractors from the contractors table
  const contractors = await db.contractor.findMany({
        select: {
          user: {
            select: {
              name: true,
            },
          },
   employeeNo: true,  
   id: true
        },
  });
  // Initialize a map to aggregate data by contractor
  const contractorMap = new Map();

  // Process each record to group by contractor
  report.data.forEach(record => {
    const contractorId = record.contractorId;
    console.log("contractorId",contractorId);
    // Check if contractor exists in the contractors data
    const contractor = contractors.find(c => c.id === contractorId);
    const contractorName = contractor ? contractor.user.name : "Unknown"; // Get contractor name or set to "Unknown"
    console.log("contractor details",contractor);
    if (!contractorMap.has(contractorId)) {
      contractorMap.set(contractorId, {
        contractorId: contractorId,
        firmName: contractorName,
        employeeNo: contractor.employeeNo, // Assuming employeeNo is available in the record
        totalWorkingHours: 0,
        name: contractor.user.name, // Assuming name is available in the record
        date: record.date,
        siteCode: contractor.siteCode ?? "-",
      });
    }

    // Accumulate total working hours for the contractor
    const contractorData = contractorMap.get(contractorId);
    contractorData.totalWorkingHours += record.hours || 0; // Add working hours
  });

  // Convert the map to an array
  const data = Array.from(contractorMap.values());

  // Create summary
  const summary = {
    total_contractors: contractorMap.size,
    total_labours: report.summary.totalLabours, // Total labours from the original report
    total_working_hours: data.reduce((acc, contractor) => acc + contractor.totalWorkingHours, 0),
    date: report.summary.date,
    startDate: startDate,
    endDate: startDate,
    average_hours_per_day: report.summary.averageHoursPerDay,
    total_days: report.summary.totalDays,
    is_summarized: "false",
  };

  return {
    data,
    summary,
    columns: [
      { field: 'contractorId', headerName: 'Contractor ID', width: 100, visible: true },
      { field: 'employeeNo', headerName: 'Employee No', width: 100, visible: true },
      { field: 'totalWorkingHours', headerName: 'Total Working Hours', width: 100, visible: true },
      { field: 'name', headerName: 'Name', width: 100 , visible: true},
      { field: 'siteCode', headerName: 'Site Code', width: 100 , visible: true},
      { field: 'date', headerName: 'Date', width: 150, visible: true },
      {field: 'startDate', headerName: 'Start Date', width: 150, visible: false},
      {field: 'endDate', headerName: 'End Date', width: 150, visible: false},
      {field: 'is_summarized', headerName: 'Is Summarized', width: 150, visible: false},
    ],
  };
};

const fetchContractorCustomReport = async (filters) => {
  const { startDate, endDate, contractorId, isSummarized = false } = filters;
  const report = await fetchCustomReportHandler({ startDate, endDate, contractorId });

  // Fetch all contractors from the contractors table
  const contractors = await db.contractor.findMany({
    select: {
      user: {
        select: {
          name: true,
        },
      },
      employeeNo: true,
      id: true
    },
  });

  // Initialize maps for both detailed and summarized data
  const contractorDateMap = new Map();
  const contractorSummaryMap = new Map();

  // Process each record to group by contractor and date
  report.data.forEach(record => {
    const contractorId = record.contractorId;
    const dateKey = record.date;
    const mapKey = `${contractorId}-${dateKey}`;

    // Check if contractor exists in the contractors data
    const contractor = contractors.find(c => c.id === contractorId);
    const contractorName = contractor ? contractor.user.name : "Unknown";

    if (!contractorDateMap.has(mapKey)) {
      contractorDateMap.set(mapKey, {
        contractorId: contractorId,
        firmName: contractorName,
        employeeNo: contractor?.employeeNo || "-",
        totalWorkingHours: 0,
        name: contractor?.user?.name || "Unknown",
        date: dateKey,
        siteCode: contractor?.siteCode || "-",
      });
    }

    // Update daily records
    const contractorData = contractorDateMap.get(mapKey);
    contractorData.totalWorkingHours = parseFloat((contractorData.totalWorkingHours + (record.hours || 0)).toFixed(2));

    // Update summarized records
    if (!contractorSummaryMap.has(contractorId)) {
      contractorSummaryMap.set(contractorId, {
        contractorId: contractorId,
        firmName: contractorName,
        employeeNo: contractor?.employeeNo || "-",
        totalWorkingHours: 0,
        name: contractor?.user?.name || "Unknown",
        startDate: startDate,
        endDate: endDate,
        siteCode: contractor?.siteCode || "-",
      });
    }
    const summaryData = contractorSummaryMap.get(contractorId);
    summaryData.totalWorkingHours = parseFloat((summaryData.totalWorkingHours + (record.hours || 0)).toFixed(2));
  });

  // Choose which data to use based on isSummarized flag
  const data = isSummarized 
    ? Array.from(contractorSummaryMap.values())
    : Array.from(contractorDateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate unique contractors and total working hours
  const uniqueContractors = new Set(data.map(item => item.contractorId));

  const summary = {
    total_contractors: uniqueContractors.size,
    total_labours: report.summary.totalLabours,
    total_working_hours: parseFloat(data.reduce((acc, record) => acc + record.totalWorkingHours, 0).toFixed(2)),
      start_date: startDate,
      end_date: endDate
  ,
    average_hours_per_day: parseFloat(report.summary.averageHoursPerDay.toFixed(2)),
    total_days: report.summary.totalDays
  };

  // Define columns based on isSummarized flag
  const columns = [
    { field: 'contractorId', headerName: 'Contractor ID', width: 100, visible: true },
    { field: 'employeeNo', headerName: 'Employee No', width: 100, visible: true },
    { field: 'totalWorkingHours', headerName: 'Total Working Hours', width: 100, visible: true },
    { field: 'name', headerName: 'Name', width: 100, visible: true },
    { field: 'siteCode', headerName: 'Site Code', width: 100, visible: false },
    { field: 'date', headerName: 'Date', width: 100, visible: isSummarized == "true" ? false : true },
    { field: 'startDate', headerName: 'Start Date', width: 100, visible: isSummarized == "true" ? true : false },
    { field: 'endDate', headerName: 'End Date', width: 100, visible: isSummarized == "true" ? true : false }
  ];

  return {
    data,
    summary,
    columns,
  };
};

const formatResultTime = (time) => {
  if (!time) return null;
  const options = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // Use 24-hour format
  };
  return new Date(time).toLocaleString('en-US', options);
};

const reportService = {
  fetchLabourReportHandler,
  fetchLabourReportByIdHandler,
  fetchContractorLabourReportHandler,
  fetchDailyReportHandler,
  fetchCustomReportHandler,
  fetchContractorReport,
  fetchContractorDailyReport,
  fetchContractorCustomReport,
};

module.exports = reportService;
