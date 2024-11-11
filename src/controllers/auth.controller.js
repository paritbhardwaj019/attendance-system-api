const httpStatus = require('http-status');
const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');

const loginWithUserNameHandler = catchAsync(async (req, res) => {
  const loggedInUser = await authService.loginWithUserNameHandler(req.body);
  res.status(httpStatus.OK).send(loggedInUser);
});

const refreshAccessTokenHandler = catchAsync(async (req, res) => {
  const newAccessToken = await authService.refreshAccessTokenHandler(req.body);
  res.status(httpStatus.OK).send(newAccessToken);
});

const authController = {
  loginWithUserNameHandler,
  refreshAccessTokenHandler,
};

module.exports = authController;
