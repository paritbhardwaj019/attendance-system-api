const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const dashboardService = require('../services/dashboard.service');
const ApiError = require('../utils/ApiError');

/**
 * Get dashboard summary including counts and today's visits
 */
const getDashboardSummary = catchAsync(async (req, res) => {
  const dashboardData = await dashboardService.getDashboardSummary();
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Dashboard data retrieved successfully', dashboardData));
});

const dashboardController = {
  getDashboardSummary,
};

module.exports = dashboardController;
