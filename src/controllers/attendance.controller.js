const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const attendanceService = require('../services/attendance.service');
const logger = require('../config/logger');

const recordAttendance = catchAsync(async (req, res) => {
  const attendance = await attendanceService.recordAttendance(req.user.id, req.body.fingerprint_data);
  res
    .status(httpStatus.CREATED)
    .json(ApiResponse.success(httpStatus.CREATED, 'Attendance recorded successfully', attendance));
});

const getAttendance = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const attendance = await attendanceService.getAttendanceRecordsForManagerAndContractors(
    parseInt(req.params.id, 10),
    startDate,
    endDate
  );
  res
    .status(httpStatus.OK)
    .json(ApiResponse.success(httpStatus.OK, 'Attendance records retrieved successfully', attendance));
});

const getLabourAttendance = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const attendance = await attendanceService.getAttendanceRecords(req.user.id, startDate, endDate);
  res
    .status(httpStatus.OK)
    .json(ApiResponse.success(httpStatus.OK, 'Labour attendance records retrieved successfully', attendance));
});

const fetchAndStoreAttendance = catchAsync(async (req, res) => {
  const attendance = await attendanceService.fetchAndStoreAttendance();
  res
    .status(httpStatus.OK)
    .json(ApiResponse.success(httpStatus.OK, 'Attendance fetched and stored successfully', attendance));
});
// const getAttendanceReport = catchAsync(async (req, res) => {
//   const { startDate, endDate, view = 'daily' } = req.query;

//   if (!startDate || !endDate) {
//     const today = new Date();
//     startDate = today.toISOString().split('T')[0];
//     endDate = today.toISOString().split('T')[0];
//   }

//   if (!['daily', 'monthly', 'contractor'].includes(view)) {
//     return res
//       .status(httpStatus.BAD_REQUEST)
//       .json(ApiResponse.error(httpStatus.BAD_REQUEST, 'Invalid view type. Must be daily, monthly, or contractor'));
//   }

//   const report = await attendanceService.generateAttendanceReport(startDate, endDate, view);
//   res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Attendance report generated successfully', report));
// });

const attendanceController = {
  recordAttendance,
  getAttendance,
  getLabourAttendance,
  fetchAndStoreAttendance
  // getAttendanceReport,
};

module.exports = attendanceController;
