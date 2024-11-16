const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const attendanceService = require('../services/attendance.service');

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

const getStaffAttendance = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const attendance = await attendanceService.getAttendanceRecords(req.user.id, startDate, endDate);
  res
    .status(httpStatus.OK)
    .json(ApiResponse.success(httpStatus.OK, 'Staff attendance records retrieved successfully', attendance));
});

const attendanceController = {
  recordAttendance,
  getAttendance,
  getStaffAttendance,
};

module.exports = attendanceController;
