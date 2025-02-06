const httpStatus = require('http-status');
const reportService = require('../services/report.service');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');

/**
 * Handler to fetch labour attendance report with filters.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const getLabourReport = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['labourId', 'contractorId', 'startDate', 'endDate', 'sortBy', 'order', 'page', 'limit']);
  const report = await reportService.fetchLabourReportHandler(filters);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Labour report retrieved successfully', report));
});

/**
 * Handler to fetch detailed labour report by labour ID.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const getLabourReportById = catchAsync(async (req, res) => {
  const { id } = pick(req.params, ['id']);
  const filters = pick(req.query, ['startDate', 'endDate']);
  const report = await reportService.fetchLabourReportByIdHandler(parseInt(id, 10), filters);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Labour report retrieved successfully', report));
});

/**
 * Handler to fetch contractor-wise labour working hours report.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const getContractorLabourReport = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['startDate', 'endDate']);
  const report = await reportService.fetchContractorLabourReportHandler(filters);
  res
    .status(httpStatus.OK)
    .json(ApiResponse.success(httpStatus.OK, 'Contractor labour report retrieved successfully', report));
});

const getDailyReport = catchAsync(async (req, res) => {
  // Only pick startDate and optional contractorId
  const filters = pick(req.query, ['startDate', 'contractorId']);
  
  // Validate required startDate
  if (!filters.startDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'startDate is required');
  }

  const report = await reportService.fetchDailyReportHandler(filters);
  res.status(httpStatus.OK).json(
    ApiResponse.success(
      httpStatus.OK, 
      'Daily report retrieved successfully', 
      report
    )
  );
});

const getCustomReport = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['startDate', 'endDate', 'contractorId']);
  const report = await reportService.fetchCustomReportHandler(filters);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Custom report retrieved successfully', report));
});

const getContractorDailyReport = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['startDate', 'contractorId']);
  const report = await reportService.fetchContractorDailyReport(filters);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Contractor daily report retrieved successfully', report));
});

const getContractorCustomReport = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['startDate', 'endDate', 'contractorId', 'isSummarized']);
  const report = await reportService.fetchContractorCustomReport(filters);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Contractor custom report retrieved successfully', report));
});

const reportController = {
  getLabourReport,
  getLabourReportById,
  getContractorLabourReport,
  getDailyReport,
  getCustomReport,
  getContractorDailyReport,
  getContractorCustomReport,
};

module.exports = reportController;
