const db = require('../database/prisma');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Table headers configuration for the dashboard
 * Includes field definitions, visibility, and data mapping
 */
const DASHBOARD_HEADERS = {
  VISITOR_LIST: [
    { field: 'ticketId', headerName: 'Ticket ID', width: '130', sortable: true },
    { field: 'name', headerName: 'Visitor Name', width: '150', sortable: true },
    { field: 'contact', headerName: 'Mobile', width: '130', sortable: true },
    { field: 'companyName', headerName: 'Company', width: '150', sortable: true },
    { field: 'visitPurpose', headerName: 'Purpose', width: '200', sortable: true },
    { field: 'meetingWith', headerName: 'Meeting With', width: '150', sortable: true },
    { field: 'status', headerName: 'Status', width: '100', sortable: true },
    { field: 'entryTime', headerName: 'Entry Time', width: '130', sortable: true },
    { field: 'exitTime', headerName: 'Exit Time', width: '130', sortable: true },
    { field: 'plantName', headerName: 'Plant', width: '130', sortable: true },
    { field: 'requestTime', headerName: 'Request Time', width: '130', sortable: true },
  ],
};

/**
 * Get headers for a specific dashboard view
 * @param {string} viewType - Type of view (e.g., 'visitor_list')
 * @returns {Array} Headers configuration for the specified view
 */
const getHeadersForView = (viewType) => {
  switch (viewType.toLowerCase()) {
    case 'visitor_list':
      return DASHBOARD_HEADERS.VISITOR_LIST;
    default:
      return [];
  }
};

/**
 * Transform visitor data to match the table structure
 * @param {Array} visitors - Raw visitor data from database
 * @returns {Array} Transformed visitor records
 */
const transformVisitorData = (visitors) => {
  const headers = getHeadersForView('visitor_list');

  return visitors.map((visitor) => {
    const transformed = {
      id: visitor.id,
    };

    headers.forEach((header) => {
      transformed[header.key] = header.getValue(visitor);
    });

    return transformed;
  });
};

/**
 * Get dashboard summary data including visitor information
 * @returns {Object} Dashboard summary including counts and today's visits
 */
const getDashboardSummary = async () => {
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
      visitorSignup: true,
      createdBy: {
        select: {
          name: true,
          username: true,
        },
      },
      approvedBy: {
        select: {
          name: true,
          username: true,
        },
      },
    },
    orderBy: {
      requestTime: 'desc',
    },
  });

  const [pendingCount, monthlyVisitsCount, approvedVisitsCount] = await Promise.all([
    db.visitor.count({
      where: {
        status: 'PENDING',
      },
    }),
    db.visitor.count({
      where: {
        status: 'APPROVED',
        startDate: {
          gte: startOfMonth,
          lte: endOfToday,
        },
      },
    }),
    db.visitor.count({
      where: {
        status: 'APPROVED',
      },
    }),
  ]);

  const headers = getHeadersForView('visitor_list');
  return {
    summary: {
      todayVisitCount: todayVisits.length,
      pendingRequestCount: pendingCount,
      monthlyVisitsCount,
      approvedVisitsCount,
    },
    todayVisits: transformVisitorData(todayVisits),
    columnModel: headers,
  };
};

const dashboardService = {
  getDashboardSummary,
  getHeadersForView,
};

module.exports = dashboardService;
