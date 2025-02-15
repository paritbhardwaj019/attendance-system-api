const db = require('../database/prisma');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Get dashboard column model configuration
 * @returns {Array} Column configuration for dashboard
 */
const getDashboardColumns = () => {
  return [
    {
      field: 'ticketId',
      headerName: 'Ticket ID',
      width: 130,
      isVisible: true,
    },
    {
      field: 'name',
      headerName: 'Visitor Name',
      width: 150,
      isVisible: true,
    },
    {
      field: 'mobileNumber',
      headerName: 'Mobile',
      width: 130,
      isVisible: true,
    },
    {
      field: 'companyName',
      headerName: 'Company',
      width: 150,
      isVisible: true,
    },
    {
      field: 'visitPurpose',
      headerName: 'Purpose',
      width: 200,
      isVisible: true,
    },
    {
      field: 'meetingWith',
      headerName: 'Meeting With',
      width: 150,
      isVisible: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      isVisible: true,
    },
    {
      field: 'entryTime',
      headerName: 'Entry Time',
      width: 130,
      isVisible: true,
    },
    {
      field: 'exitTime',
      headerName: 'Exit Time',
      width: 130,
      isVisible: true,
    },
    {
      field: 'plantName',
      headerName: 'Plant',
      width: 130,
      isVisible: true,
    },
  ];
};

/**
 * Get flat visitor data structure
 * @param {Array} visitors - Array of visitor records with related data
 * @returns {Array} Flattened visitor records
 */
const flattenVisitorData = (visitors) => {
  return visitors.map((visitor) => ({
    id: visitor.id,
    ticketId: visitor.ticketId,
    name: visitor.name,
    mobileNumber: visitor.mobileNumber,
    email: visitor.email,
    companyName: visitor.companyName,
    visitPurpose: visitor.visitPurpose,
    meetingWith: visitor.meetingWith,
    status: visitor.status,
    plantName: visitor.plant?.name || '',
    entryTime: visitor.entries?.[0]?.entryTime || null,
    exitTime: visitor.entries?.[0]?.exitTime || null,
    requestTime: visitor.requestTime,
    remarks: visitor.remarks,
  }));
};

/**
 * Get dashboard summary data
 * @returns {Object} Dashboard summary including counts and today's visits
 */
const getDashboardSummary = async () => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayVisits = await db.visitor.findMany({
      where: {
        startDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        plant: true,
        entries: {
          where: {
            dateOfVisit: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
          orderBy: {
            dateOfVisit: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        requestTime: 'desc',
      },
    });

    const pendingCount = await db.visitor.count({
      where: {
        status: 'PENDING',
      },
    });

    const monthlyVisitsCount = await db.visitor.count({
      where: {
        status: 'APPROVED',
        startDate: {
          gte: startOfMonth,
          lte: endOfToday,
        },
      },
    });

    const approvedVisitsCount = await db.visitor.count({
      where: {
        status: 'APPROVED',
      },
    });

    return {
      summary: {
        todayVisitCount: todayVisits.length,
        pendingRequestCount: pendingCount,
        monthlyVisitsCount,
        approvedVisitsCount,
      },
      todayVisits: flattenVisitorData(todayVisits),
      columnModel: getDashboardColumns(),
    };
  } catch (error) {
    console.error('Error in getDashboardSummary:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving dashboard data');
  }
};

const dashboardService = {
  getDashboardSummary,
};

module.exports = dashboardService;
