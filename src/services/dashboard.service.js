const db = require('../database/prisma');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Table headers configuration for the dashboard
 * Includes field definitions, visibility, and data mapping
 */
const DASHBOARD_HEADERS = {
  VISITOR_LIST: [
    {
      key: 'ticketId',
      label: 'Ticket ID',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.ticketId,
    },
    {
      key: 'name',
      label: 'Visitor Name',
      width: 150,
      sortable: true,
      getValue: (visitor) => visitor.name,
    },
    {
      key: 'contact',
      label: 'Mobile',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.contact,
    },
    {
      key: 'companyName',
      label: 'Company',
      width: 150,
      sortable: true,
      getValue: (visitor) => visitor.companyName,
    },
    {
      key: 'visitPurpose',
      label: 'Purpose',
      width: 200,
      sortable: true,
      getValue: (visitor) => visitor.visitPurpose,
    },
    {
      key: 'meetingWith',
      label: 'Meeting With',
      width: 150,
      sortable: true,
      getValue: (visitor) => visitor.meetingWith,
    },
    {
      key: 'status',
      label: 'Status',
      width: 100,
      sortable: true,
      getValue: (visitor) => visitor.status,
    },
    {
      key: 'entryTime',
      label: 'Entry Time',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.entries?.[0]?.entryTime || null,
    },
    {
      key: 'exitTime',
      label: 'Exit Time',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.entries?.[0]?.exitTime || null,
    },
    {
      key: 'plantName',
      label: 'Plant',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.plant?.name || '',
    },
    {
      key: 'requestTime',
      label: 'Request Time',
      width: 130,
      sortable: true,
      getValue: (visitor) => visitor.requestTime,
    },
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

  const headers = getHeadersForView('visitor_list').map((header) => ({
    field: header.key,
    headerName: header.label,
    width: header.width,
    sortable: header.sortable,
  }));

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
