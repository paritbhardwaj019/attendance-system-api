const httpStatus = require('http-status');
const reportService = require('../services/report.service');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const pick = require('../utils/pick');

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

const reportController = {
  getLabourReport,
  getLabourReportById,
  getContractorLabourReport,
};

module.exports = reportController;
