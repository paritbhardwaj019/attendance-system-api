const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const visitorService = require('../services/visitor.service');
const db = require('../database/prisma');

const registerVisitor = catchAsync(async (req, res) => {
  const isVisitorLoggedIn = req.user.role === 'VISITOR';
  let visitorSignupId = null;
  let userId = null;

  if (isVisitorLoggedIn) {
    const visitorSignup = await db.visitorSignup.findUnique({
      where: {
        id: req.user.id,
      },
    });
    if (!visitorSignup) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Visitor signup not found');
    }
    visitorSignupId = visitorSignup.id;
  } else {
    userId = req.user.id;
  }

  const visitor = await visitorService.registerVisitor(req.body, userId, visitorSignupId, req.files);

  console.log('VISITOR', visitor);

  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Visitor registered successfully', visitor));
});

const processVisitorRequest = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const { status, remarks } = req.body;

  const processedVisitor = await visitorService.processVisitorRequest(ticketId, status, remarks, req.user.id);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Visitor request processed', processedVisitor));
});

const getVisitorStatus = catchAsync(async (req, res) => {
  const { identifier } = req.params;

  const visitorStatus = await visitorService.getVisitorStatus(identifier);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Visitor status retrieved', visitorStatus));
});

const listVisitorRequests = catchAsync(async (req, res) => {
  const { status, startDate, endDate, addedBy } = req.query;
  const isVisitorLoggedIn = req.user.role === 'VISITOR';

  let filterOptions = {
    status,
    startDate,
    endDate,
  };

  if (isVisitorLoggedIn) {
    const visitorSignup = await db.visitorSignup.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!visitorSignup) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Visitor signup not found');
    }

    filterOptions.visitorSignupId = visitorSignup.id;
  } else {
    if (addedBy) {
      filterOptions.createdById = addedBy;
    }
  }

  const visitors = await visitorService.listVisitorRequests(filterOptions);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Visitor requests retrieved', visitors));
});

const handleVisitorEntry = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const result = await visitorService.handleVisitorEntry(ticketId);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, `Visitor ${result.action} marked successfully`, result));
});

const getVisitorRecords = catchAsync(async (req, res) => {
  const { startDate, endDate, plantId } = req.query;
  const records = await visitorService.getVisitorRecords(startDate, endDate, plantId);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Visitor records retrieved', records));
});

const visitorController = {
  registerVisitor,
  processVisitorRequest,
  getVisitorStatus,
  listVisitorRequests,
  handleVisitorEntry,
  getVisitorRecords,
};

module.exports = visitorController;
