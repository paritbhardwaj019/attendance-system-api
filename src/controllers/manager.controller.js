const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const managerService = require('../services/manager.service');
const { ROLES } = require('../config/roles');

/**
 * Controller to add a new contractor with files.
 */
const addContractor = catchAsync(async (req, res) => {
  const contractorData = {
    name: req.body.name,
    username: req.body.username,
    password: req.body.password,
    mobile_number: req.body.mobile_number,
    firm_name: req.body.firm_name,
    aadhar_number: req.body.aadhar_number,
    managerId: req.body.managerId,
  };

  const files = {
    photos: req.files?.['photos'] || [],
    pdfs: req.files?.['pdfs'] || [],
  };

  const contractor = await managerService.addContractorHandler(req.user, contractorData, files);

  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Contractor added successfully', contractor));
});

/**
 * Controller to edit an existing contractor.
 */
const editContractor = catchAsync(async (req, res) => {
  const contractorId = parseInt(req.params.contractorId, 10);
  const contractorData = {
    name: req.body.name,
    username: req.body.username,
    password: req.body.password,
    mobile_number: req.body.mobile_number,
    firm_name: req.body.firm_name,
    aadhar_number: req.body.aadhar_number,
    managerId: req.body.managerId,
  };

  const files = {
    photos: req.files?.['photos'] || [],
    pdfs: req.files?.['pdfs'] || [],
  };

  const updatedContractor = await managerService.editContractorHandler(req.user, contractorId, contractorData, files);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Contractor updated successfully', updatedContractor));
});

/**
 * Controller to delete a contractor.
 */
const deleteContractor = catchAsync(async (req, res) => {
  const contractorId = parseInt(req.params.contractorId, 10);
  const result = await managerService.deleteContractorHandler(req.user, contractorId);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, result.message));
});

/**
 * Controller to fetch contractors with optional filters, sorting, and pagination.
 */
const getContractors = catchAsync(async (req, res) => {
  const filters = {
    search: req.query.search,
    sortBy: req.query.sortBy,
    order: req.query.order,
    page: req.query.page ? parseInt(req.query.page, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : 10,
    managerId: req.query.managerId,
  };

  const contractors = await managerService.fetchContractorsHandler(filters, req.user);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Contractors retrieved successfully', contractors));
});

/**
 * Controller to add a new labour (staff) with files.
 */
const addLabour = catchAsync(async (req, res) => {
  const contractorId = req.body.contractorId ? parseInt(req.body.contractorId, 10) : null;

  const labourData = {
    name: req.body.name,
    username: req.body.username,
    password: req.body.password,
    mobile_number: req.body.mobile_number,
    fingerprint_data: req.body.fingerprint_data,
    aadhar_number: req.body.aadhar_number,
  };

  const files = {
    photos: req.files?.['photos'] || [],
    pdfs: req.files?.['pdfs'] || [],
  };

  const labour = await managerService.addLabourHandler(req.user, contractorId, labourData, files);

  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Labour added successfully', labour));
});

/**
 * Controller to edit an existing labour.
 */
const editLabour = catchAsync(async (req, res) => {
  const labourId = parseInt(req.params.labourId, 10);
  const labourData = {
    name: req.body.name,
    username: req.body.username,
    password: req.body.password,
    mobile_number: req.body.mobile_number,
    fingerprint_data: req.body.fingerprint_data,
    aadhar_number: req.body.aadhar_number,
    contractorId: req.body.contractorId ? parseInt(req.body.contractorId, 10) : undefined,
  };

  const files = {
    photos: req.files?.['photos'] || [],
    pdfs: req.files?.['pdfs'] || [],
  };

  const updatedLabour = await managerService.editLabourHandler(req.user, labourId, labourData, files);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Labour updated successfully', updatedLabour));
});

/**
 * Controller to delete a labour.
 */
const deleteLabour = catchAsync(async (req, res) => {
  const labourId = parseInt(req.params.labourId, 10);
  const result = await managerService.deleteLabourHandler(req.user, labourId);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, result.message));
});

/**
 * Controller to fetch labour members with optional filters, sorting, and pagination.
 */
const getLabour = catchAsync(async (req, res) => {
  const filters = {
    search: req.query.search,
    sortBy: req.query.sortBy,
    order: req.query.order,
    page: req.query.page ? parseInt(req.query.page, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : 10,
    contractorId: req.query.contractorId ? parseInt(req.query.contractorId, 10) : null,
  };

  const labour = await managerService.getLabourHandler(filters, req.user);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Labour list retrieved successfully', labour));
});

const managerController = {
  addContractor,
  editContractor,
  deleteContractor,
  getContractors,
  addLabour,
  editLabour,
  deleteLabour,
  getLabour,
};

module.exports = managerController;
