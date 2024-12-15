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
    managerId: req.body.managerId, // Optional, for admin to assign contractor to manager
  };

  const files = {
    photos: req.files?.['photos'] || [],
    pdfs: req.files?.['pdfs'] || [],
  };

  const contractor = await managerService.addContractorHandler(req.user, contractorData, files);

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
    page: req.query.page ? parseInt(req.query.page, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : 10,
    managerId: req.query.managerId, // Optional, for admin to filter by manager
  };

  const contractors = await managerService.fetchContractorsHandler(filters, req.user);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Contractors retrieved successfully', contractors));
});

/**
 * Controller to add a new labour (staff) with files.
 * Labour can be added with or without contractor association
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
 * Controller to fetch labour members with optional filters, sorting, and pagination.
 * Can fetch all labour or filter by contractor
 */
const getLabour = catchAsync(async (req, res) => {
  const filters = {
    search: req.query.search,
    sortBy: req.query.sortBy,
    order: req.query.order,
    page: req.query.page,
    limit: req.query.limit,
    contractorId: req.query.contractorId ? parseInt(req.query.contractorId, 10) : null,
  };

  const labour = await managerService.getLabourHandler(filters, req.user);

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Labour list retrieved successfully', labour));
});

const managerController = {
  addContractor,
  getContractors,
  addLabour,
  getLabour, // Renamed from getContractorLabour for more flexibility
};

module.exports = managerController;
