const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/utils');
const config = require('../config/config');

/**
 * Middleware to authenticate the user using JWT.
 * Checks for the token in 'x-auth-token' header.
 */

const checkJWT = (req, res, next) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'No token provided'));
  }

  try {
    const decoded = verifyToken(token, config.jwt.secret);

    req.user = decoded;
    next();
  } catch (error) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'));
  }
};

module.exports = checkJWT;
