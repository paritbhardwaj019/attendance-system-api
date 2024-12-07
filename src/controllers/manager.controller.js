const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const managerService = require('../services/manager.service');
const { ROLES } = require('../config/roles');

/**
 * Controller to add a new contractor with files.
 */
const addContractor = catchAsync(async (req, res) => {
  const managerUserId = parseInt(req.user.id, 10);

  const contractorData = {
    name: req.body.name,
    username: req.body.username,
    password: req.body.password,
    mobile_number: req.body.mobile_number,
    firm_name: req.body.firm_name,
    aadhar_number: req.body.aadhar_number,
  };

  const files = {
    photos: req.files['photos'] || [],
    pdfs: req.files['pdfs'] || [],
  };

  const contractor = await managerService.addContractorHandler(managerUserId, contractorData, files);

  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Contractor added successfully', contractor));
});

/**
 * Controller to fetch contractors with optional filters, sorting, and pagination.
 */
const getContractors = catchAsync(async (req, res) => {
  const filters = {
    search: req.query.search,
    sortBy: req.query.sortBy,
    order: req.query.order,
    page: req.query.page,
    limit: req.query.limit,
    managerId: req.query.managerId,
  };

  if (req.user.role === ROLES.ADMIN && !filters.managerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Manager ID is required for admin');
  }

  const contractors = await managerService.fetchContractorsHandler(filters, req.user);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Contractors retrieved successfully', contractors));
});

/**
 * Controller to add a new labour (staff) with files.
 */
const addLabour = catchAsync(async (req, res) => {
  const contractorId = parseInt(req.body.contractorId, 10);

  const labourData = {
    name: req.body.name,
    username: req.body.username,
    password: req.body.password,
    mobile_number: req.body.mobile_number,
    fingerprint_data: req.body.fingerprint_data,
    aadhar_number: req.body.aadhar_number,
  };

  const files = {
    photos: req.files['photos'] || [],
    pdfs: req.files['pdfs'] || [],
  };

  const labour = await managerService.addLabourHandler(contractorId, labourData, files);

  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Labour added successfully', labour));
});

/**
 * Controller to fetch labour members under a specific contractor with optional filters, sorting, and pagination.
 */
const getContractorLabour = catchAsync(async (req, res) => {
  const contractorId = parseInt(req.params.id, 10);

  const filters = {
    search: req.query.search,
    sortBy: req.query.sortBy,
    order: req.query.order,
    page: req.query.page,
    limit: req.query.limit,
  };

  // Pass the user, contractorId, and filters to the service handler
  const labour = await managerService.getContractorLabour(req.user, contractorId, filters);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Labour list retrieved successfully', labour));
});

const managerController = {
  addContractor,
  getContractors,
  addLabour,
  getContractorLabour,
};

module.exports = managerController;
