const httpStatus = require('http-status');
const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

const loginWithUserNameHandler = catchAsync(async (req, res) => {
  const loggedInUser = await authService.loginWithUserNameHandler(req.body);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Login successful. Welcome back!', loggedInUser));
});

const authController = {
  loginWithUserNameHandler,
};

module.exports = authController;
