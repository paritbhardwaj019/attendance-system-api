const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const cameraService = require('../services/camera.service');

/**
 * Search users in camera system
 */
const searchUser = catchAsync(async (req, res) => {
  const position = parseInt(req.query.position, 10) || 0;
  const maxResults = parseInt(req.query.maxResults, 10) || 100;

  const searchResults = await cameraService.searchUserInCamera(position, maxResults);

  res.status(httpStatus.OK).json(
    ApiResponse.success(httpStatus.OK, 'Search completed successfully', {
      results: searchResults,
      metadata: {
        position,
        maxResults,
      },
    })
  );
});

module.exports = {
  searchUser,
};
