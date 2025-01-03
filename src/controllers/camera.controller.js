const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const cameraService = require('../services/camera.service');

/**
 * Search users in camera system
 */
const searchUser = catchAsync(async (req, res) => {
  const { searchId } = req.query;
  const position = parseInt(req.query.position, 10) || 0;
  const maxResults = parseInt(req.query.maxResults, 10) || 100;

  if (!searchId) {
    return res.status(httpStatus.BAD_REQUEST).json(ApiResponse.error(httpStatus.BAD_REQUEST, 'Search ID is required'));
  }

  const searchResults = await cameraService.searchUserInCamera(searchId, position, maxResults);

  res.status(httpStatus.OK).json(
    ApiResponse.success(httpStatus.OK, 'Search completed successfully', {
      results: searchResults,
      metadata: {
        searchId,
        position,
        maxResults,
      },
    })
  );
});

module.exports = {
  searchUser,
};
