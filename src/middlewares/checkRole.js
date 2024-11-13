const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to authorize based on user roles.
 * @param {Array<string>} roles - Array of roles that are allowed to access the route.
 */

const checkRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Access denied'));
  }
  next();
};

module.exports = checkRole;
