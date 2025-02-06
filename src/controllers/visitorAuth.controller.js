const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const visitorAuthService = require('../services/visitorAuth.service');

const visitorSignup = catchAsync(async (req, res) => {
  const visitor = await visitorAuthService.visitorSignupHandler(req.body);

  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'Visitor signup successful', visitor));
});

const visitorLogin = catchAsync(async (req, res) => {
  const { visitor, accessToken } = await visitorAuthService.visitorLoginHandler(req.body);

  res.status(httpStatus.OK).json(
    ApiResponse.success(httpStatus.OK, 'Visitor login successful', {
      visitor,
      accessToken,
    })
  );
});

const visitorAuthController = {
  visitorSignup,
  visitorLogin,
};

module.exports = visitorAuthController;
