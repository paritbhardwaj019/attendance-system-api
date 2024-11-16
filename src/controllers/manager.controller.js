const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const managerService = require('../services/manager.service');

const addContractor = catchAsync(async (req, res) => {
  const contractor = await managerService.addContractorHandler(parseInt(req.user.id, 10), req.body);
  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Contractor added successfully', contractor));
});

const getContractors = catchAsync(async (req, res) => {
  const contractors = await managerService.fetchContractorsHandler(req.query, req.user);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Contractors retrieved successfully', contractors));
});

const addStaff = catchAsync(async (req, res) => {
  const staff = await managerService.addStaff(req.user, req.body);
  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Staff added successfully', staff));
});

const getContractorStaff = catchAsync(async (req, res) => {
  const staff = await managerService.getContractorStaff(req.user, req.params.id, req.query);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Staff list retrieved successfully', staff));
});

const managerController = {
  addContractor,
  getContractors,
  addStaff,
  getContractorStaff,
};

module.exports = managerController;
