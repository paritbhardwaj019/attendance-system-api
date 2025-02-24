const { v4: uuidv4 } = require('uuid');
const db = require('../database/prisma');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { getHeadersForView, transformData } = require('../constants/meal');
const { connect } = require('mongoose');

/**
 * Generate unique ticket ID for meal requests
 * @returns {string} Unique ticket ID
 */
const generateTicketId = () => {
  return `MEAL-${uuidv4().slice(0, 8).toUpperCase()}`;
};

/**
 * Create a new meal
 * @param {Object} mealData
 * @returns {Object} Created meal
 */
const createMeal = async (mealData) => {
  if (!mealData.name || !mealData.price) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Name and price are required');
  }

  const meal = await db.meal.create({
    data: {
      name: mealData.name,
      price: mealData.price,
    },
  });

  return meal;
};

/**
 * Get all meals
 * @returns {Object} List of meals with headers
 */
const getMeals = async () => {
  const meals = await db.meal.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const headers = getHeadersForView('meals');

  return {
    headers,
    data: transformData(meals, 'meals'),
  };
};

/**
 * Delete a meal
 * @param {number} mealId
 */
const deleteMeal = async (mealId) => {
  const meal = await db.meal.findUnique({
    where: { id: mealId },
    include: {
      mealRequests: true,
    },
  });

  if (!meal) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meal not found');
  }

  if (meal.mealRequests.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete meal with existing requests');
  }

  await db.meal.delete({
    where: { id: mealId },
  });
};

/**
 * Request a meal
 * @param {Object} requestData
 * @param {number} userId
 * @returns {Object} Created meal request with details
 */
const requestMeal = async (requestData, loggedInUser) => {
  const { mealId, quantity = 1, plantId } = requestData;

  if (!mealId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Meal ID is required');
  }

  const meal = await db.meal.findUnique({
    where: { id: mealId },
  });

  if (!meal) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meal not found');
  }

  if (plantId) {
    const plant = await db.plant.findUnique({
      where: { id: plantId },
    });

    if (!plant) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Plant not found');
    }
  }

  const ticketId = generateTicketId();

  const mealRequest = await db.mealRequest.create({
    data: {
      meal: {
        connect: {
          id: mealId,
        },
      },
      user: {
        connect: {
          id: loggedInUser.id,
        },
      },
      quantity,
      plant: {
        connect: {
          id: plantId,
        },
      },
      ticketId,
      status: 'PENDING',
    },
    include: {
      meal: true,
      plant: true,
      user: {
        select: {
          name: true,
          employee: {
            select: {
              department: true,
              designation: true,
              employeeNo: true,
            },
          },
        },
      },
    },
  });

  return {
    ...mealRequest,
    userName: mealRequest.user.name,
    department: mealRequest.user.employee?.department || null,
    designation: mealRequest.user.employee?.designation || null,
    employeeNo: mealRequest.user.employee?.employeeNo || null,
    user: undefined,
  };
};

/**
 * Process (approve/reject) a meal request
 * @param {string} ticketId
 * @param {string} status
 * @param {string} remarks
 * @param {number} userId
 * @returns {Object} Updated meal request
 */
const processMealRequest = async (ticketId, status, remarks, userId) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid status');
  }

  const mealRequest = await db.mealRequest.update({
    where: { ticketId },
    data: {
      status,
      remarks,
      approvedById: userId,
    },
    include: {
      meal: true,
      plant: true,
    },
  });

  if (!mealRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meal request not found');
  }

  return mealRequest;
};

/**
 * Get meal request status
 * @param {string} ticketId
 * @returns {Object} Meal request status
 */
const getMealRequestStatus = async (ticketId) => {
  const mealRequest = await db.mealRequest.findUnique({
    where: { ticketId },
    include: {
      meal: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!mealRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meal request not found');
  }

  return {
    ticketId: mealRequest.ticketId,
    status: mealRequest.status,
    remarks: mealRequest.remarks,
    meal: mealRequest.meal.name,
    quantity: mealRequest.quantity,
    requestedBy: mealRequest.user.name,
    requestTime: mealRequest.requestTime,
  };
};

/**
 * Handle meal serving/consumption
 * @param {string} ticketId
 * @returns {Object} Updated meal entry details
 */
const handleMealEntry = async (ticketId) => {
  const mealRequest = await db.mealRequest.findUnique({
    where: { ticketId },
    include: {
      entries: {
        where: {
          dateOfMeal: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        orderBy: {
          dateOfMeal: 'desc',
        },
      },
    },
  });

  if (!mealRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meal request not found');
  }

  if (mealRequest.status !== 'APPROVED') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only approved meal requests can be served/consumed');
  }

  const latestEntry = mealRequest.entries[0];
  let shouldCreateNewEntry = false;
  let isConsumption = false;

  if (!latestEntry) {
    shouldCreateNewEntry = true;
  } else if (latestEntry.serveTime && latestEntry.consumeTime) {
    shouldCreateNewEntry = true;
  } else if (latestEntry.serveTime && !latestEntry.consumeTime) {
    isConsumption = true;
  }

  let updatedEntry;

  if (shouldCreateNewEntry) {
    updatedEntry = await db.mealEntry.create({
      data: {
        mealRequest: {
          connect: {
            id: mealRequest.id,
          },
        },
        plant: {
          connect: {
            id: mealRequest.plantId,
          },
        },
        dateOfMeal: new Date(),
        serveTime: new Date(),
      },
    });
  } else {
    updatedEntry = await db.mealEntry.update({
      where: { id: latestEntry.id },
      data: { consumeTime: new Date() },
    });
  }

  return {
    action: isConsumption ? 'CONSUMED' : 'SERVED',
    time: isConsumption ? updatedEntry.consumeTime : updatedEntry.serveTime,
    ticketId: mealRequest.ticketId,
  };
};

const listMealRequests = async (filters = {}, loggedInUser) => {
  const { status, startDate, endDate, userId, plantId } = filters;

  const whereClause = {};

  if (status) {
    whereClause.status = status;
  }

  if (startDate && endDate) {
    whereClause.requestTime = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (userId) {
    whereClause.userId = userId;
  }

  if (plantId) {
    whereClause.plantId = plantId;
  }

  const mealRequests = await db.mealRequest.findMany({
    where: whereClause,
    include: {
      meal: true,
      user: {
        select: {
          name: true,
          employee: {
            select: {
              department: true,
              designation: true,
              employeeNo: true,
            },
          },
        },
      },
      plant: true,
    },
    orderBy: {
      requestTime: 'desc',
    },
  });

  const flattenedRequests = mealRequests.map((request) => ({
    ...request,
    userName: request.user.name,
    department: request.user.employee?.department || null,
    designation: request.user.employee?.designation || null,
    employeeNo: request.user.employee?.employeeNo || null,
  }));

  let headers = [
    ...getHeadersForView('requests'),
    { field: 'department', headerName: 'Department', width: 150, sortable: true },
    { field: 'designation', headerName: 'Designation', width: 150, sortable: true },
    { field: 'employeeNo', headerName: 'Employee No', width: 120, sortable: true },
  ];

  if (['ADMIN', 'MANAGER'].includes(loggedInUser.role)) {
    headers = [
      ...headers,
      { field: 'process', headerName: 'Process', width: 150, sortable: false },
      { field: 'handleEntry', headerName: 'Handle Entry', width: 150, sortable: false },
    ];
  }

  return {
    headers,
    data: transformData(flattenedRequests, 'requests'),
  };
};

/**
 * Get meal consumption records
 * @param {string} [startDate] - Optional start date
 * @param {string} [endDate] - Optional end date
 * @param {number} [plantId] - Optional plant ID
 * @returns {Object} Meal consumption records
 */
const getMealRecords = async (startDate, endDate, plantId, loggedInUser) => {
  const where = {};

  if (startDate && endDate) {
    where.dateOfMeal = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (plantId) {
    where.plantId = plantId;
  }

  const records = await db.mealEntry.findMany({
    where,
    include: {
      mealRequest: {
        include: {
          meal: true,
          user: {
            select: {
              name: true,
              employee: {
                select: {
                  department: true,
                  designation: true,
                  employeeNo: true,
                },
              },
            },
          },
        },
      },
      plant: true,
    },
    orderBy: { dateOfMeal: 'desc' },
  });

  console.log(
    'rECORDS',
    records.map((el) => el.mealRequest.user)
  );

  const flattenedRecords = records.map((record) => ({
    ...record,
    userName: record.mealRequest.user.name,
    department: record.mealRequest.user.employee?.department || null,
    designation: record.mealRequest.user.employee?.designation || null,
    employeeNo: record.mealRequest.user.employee?.employeeNo || null,
    mealRequest: {
      ...record.mealRequest,
    },
  }));

  let headers = [
    ...getHeadersForView('records'),
    { field: 'department', fieldName: 'Department', width: 150, sortable: true },
    { field: 'designation', fieldName: 'Designation', width: 150, sortable: true },
    { field: 'employeeNo', fieldName: 'Employee No', width: 120, sortable: true },
  ];

  if (['ADMIN', 'MANAGER'].includes(loggedInUser.role)) {
    headers = [
      ...headers,
      { field: 'process', fieldName: 'Process', width: 150, sortable: false },
      { field: 'handleEntry', fieldName: 'Handle Entry', width: 150, sortable: false },
    ];
  }

  return {
    headers,
    data: transformData(flattenedRecords, 'records', loggedInUser),
  };
};

const mealService = {
  createMeal,
  getMeals,
  deleteMeal,
  requestMeal,
  processMealRequest,
  getMealRequestStatus,
  handleMealEntry,
  listMealRequests,
  getMealRecords,
};

module.exports = mealService;
