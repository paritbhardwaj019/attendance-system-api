const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const mealService = require('../services/meal.service');

const createMeal = catchAsync(async (req, res) => {
  const meal = await mealService.createMeal(req.body);
  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Meal created successfully', meal));
});

const getMeals = catchAsync(async (req, res) => {
  const meals = await mealService.getMeals();
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Meals retrieved successfully', meals));
});

const deleteMeal = catchAsync(async (req, res) => {
  const { mealId } = req.params;
  await mealService.deleteMeal(parseInt(mealId));
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Meal deleted successfully'));
});

const requestMeal = catchAsync(async (req, res) => {
  const mealRequest = await mealService.requestMeal(req.body, req.user);
  res
    .status(httpStatus.CREATED)
    .json(ApiResponse.success(httpStatus.CREATED, 'Meal request created successfully', mealRequest));
});

const processMealRequest = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const { status, remarks } = req.body;

  const processedRequest = await mealService.processMealRequest(ticketId, status, remarks, req.user.id);
  res
    .status(httpStatus.OK)
    .json(ApiResponse.success(httpStatus.OK, 'Meal request processed successfully', processedRequest));
});

const getMealRequestStatus = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const status = await mealService.getMealRequestStatus(ticketId);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Meal request status retrieved', status));
});

const handleMealEntry = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const result = await mealService.handleMealEntry(ticketId);
  res
    .status(httpStatus.OK)
    .json(ApiResponse.success(httpStatus.OK, `Meal ${result.action.toLowerCase()} successfully`, result));
});

const listMealRequests = catchAsync(async (req, res) => {
  const { status, startDate, endDate, plantId } = req.query;

  const filterOptions = {
    status,
    startDate,
    endDate,
    userId: req.user.role === 'USER' ? req.user.id : undefined,
    plantId: plantId ? parseInt(plantId) : undefined,
  };

  const requests = await mealService.listMealRequests(filterOptions, req.user);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Meal requests retrieved', requests));
});

const getMealRecords = catchAsync(async (req, res) => {
  const { startDate, endDate, plantId } = req.query;
  const records = await mealService.getMealRecords(startDate, endDate, plantId ? parseInt(plantId) : undefined, req.user);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Meal records retrieved', records));
});

const mealController = {
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

module.exports = mealController;
