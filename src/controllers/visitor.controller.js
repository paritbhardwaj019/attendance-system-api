const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const visitorService = require('../services/visitor.service');

const registerVisitor = catchAsync(async (req, res) => {
  const visitor = await visitorService.registerVisitor(req.body, req.user.id);

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
  const { status, startDate, endDate } = req.query;

  const visitors = await visitorService.listVisitorRequests({
    status,
    startDate,
    endDate,
    createdById: req.user.id,
  });

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Visitor requests retrieved', visitors));
});

const visitorController = {
  registerVisitor,
  processVisitorRequest,
  getVisitorStatus,
  listVisitorRequests,
};

module.exports = visitorController;
