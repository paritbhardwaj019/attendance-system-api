const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const cameraService = require('../services/camera.service');

/**
 * Search users in camera system
 */

const searchUser = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const name = req.query.name || '';

  const today = new Date();
  const startDate = req.query.startDate ? new Date(req.query.startDate) : today;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : today;

  const searchResults = await cameraService.searchUserInCamera(page, limit, name, startDate, endDate);

  res.status(httpStatus.OK).json(
    ApiResponse.success(httpStatus.OK, 'Search completed successfully', {
      results: {
        ...searchResults,
      },
      metadata: {
        page,
        limit,
        total: searchResults.UserInfoSearch.numOfMatches,
        totalPages: Math.ceil(searchResults.UserInfoSearch.numOfMatches / limit),
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      },
    })
  );
});

const getAttendance = catchAsync(async (req, res) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  const contractorId = req.query.contractorId || null;

  const attendanceResults = await cameraService.getAttendanceRecords(startDate, endDate, contractorId);
  // console.log('ATTENDANCE RESULTS length', attendanceResults.data)
  res.status(httpStatus.OK).json(
    ApiResponse.success(httpStatus.OK, 'Attendance records retrieved successfully', {
      results: attendanceResults.data,
      summary: attendanceResults.summary,
      metadata: {
        dateRange: attendanceResults.metadata.dateRange,
      },
    })
  );
});

const getDailyAttendance = catchAsync(async (req, res) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const contractorId = req.query.contractorId || null;
  const dailyAttendance = await cameraService.getDailyAttendance(startDate, contractorId);

  res.status(httpStatus.OK).json(
    ApiResponse.success(httpStatus.OK, 'Daily attendance retrieved successfully', {
      results: dailyAttendance,
    })
  );
});

const fillDataInDb = catchAsync(async (req, res) => {
  await cameraService.fillDataInDb();
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Data filled in database successfully'));
});

const test = catchAsync(async (req, res) => {
  await cameraService.test();

  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Test completed successfully'));
});

module.exports = {
  searchUser,
  getAttendance,
  getDailyAttendance,
  fillDataInDb,
  test,
};
