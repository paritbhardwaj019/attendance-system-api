const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const plantService = require('../services/plant.service');
const ApiError = require('../utils/ApiError');

/**
 * Create a new plant
 */
const createPlant = catchAsync(async (req, res) => {
  const plant = await plantService.createPlant(req.body);
  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Plant created successfully', plant));
});

/**
 * Update plant details
 */
const updatePlant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const plant = await plantService.updatePlant(parseInt(id), req.body);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Plant updated successfully', plant));
});

/**
 * Delete a plant
 */
const deletePlant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const plant = await plantService.deletePlant(parseInt(id));
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Plant deleted successfully', plant));
});

/**
 * Get all plants with optional filtering
 */
const getPlants = catchAsync(async (req, res) => {
  const { name, code, plantHeadId } = req.query;
  const filters = {
    name,
    code,
    plantHeadId: plantHeadId ? parseInt(plantHeadId) : undefined,
  };
  const plants = await plantService.getPlants(filters);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Plants retrieved successfully', plants));
});

/**
 * Add user to plant access
 */
const addPlantMember = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId, hasAllAccess } = req.body;

  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  const member = await plantService.addPlantMember(parseInt(id), parseInt(userId), hasAllAccess);
  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'User added to plant successfully', member));
});

/**
 * Remove user from plant access
 */
const removePlantMember = catchAsync(async (req, res) => {
  const { id, userId } = req.params;
  await plantService.removePlantMember(parseInt(id), parseInt(userId));
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'User removed from plant successfully'));
});

/**
 * Get plant visitor requests
 */
const getPlantVisitorRequests = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, startDate, endDate } = req.query;

  const filters = {
    status,
    startDate,
    endDate,
  };

  const visitors = await plantService.getPlantVisitorRequests(parseInt(id), filters);
  res
    .status(httpStatus.OK)
    .json(ApiResponse.success(httpStatus.OK, 'Plant visitor requests retrieved successfully', visitors));
});

/**
 * Check user's plant access
 */
const checkPlantAccess = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  const access = await plantService.checkPlantAccess(parseInt(id), parseInt(userId));
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Plant access checked successfully', access));
});

const plantController = {
  createPlant,
  updatePlant,
  deletePlant,
  getPlants,
  addPlantMember,
  removePlantMember,
  getPlantVisitorRequests,
  checkPlantAccess,
};

module.exports = plantController;
