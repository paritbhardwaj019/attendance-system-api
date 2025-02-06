const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { createToken, hashPassword, comparePassword } = require('../utils/utils');
const config = require('../config/config');

const VISITOR_AUTH_ERRORS = {
  MOBILE_REQUIRED: 'Mobile number is required',
  PASSWORD_REQUIRED: 'Password is required',
  NAME_REQUIRED: 'Name is required',
  MOBILE_EXISTS: 'Mobile number is already registered',
  USER_NOT_FOUND: 'Visitor not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  PASSWORD_MISMATCH: 'Incorrect password',
};

const validateVisitorSignupRequest = (data) => {
  if (!data.mobile_number) {
    throw new ApiError(httpStatus.BAD_REQUEST, VISITOR_AUTH_ERRORS.MOBILE_REQUIRED);
  }

  if (!data.password) {
    throw new ApiError(httpStatus.BAD_REQUEST, VISITOR_AUTH_ERRORS.PASSWORD_REQUIRED);
  }

  if (!data.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, VISITOR_AUTH_ERRORS.NAME_REQUIRED);
  }
};

const generateAccessToken = (payload) => createToken(payload, config.jwt.secret, '24h');

const createVisitorSignupResponse = (visitorSignup) => ({
  id: visitorSignup.id,
  name: visitorSignup.name,
  mobile_number: visitorSignup.mobile_number,
});

const visitorSignupHandler = async (data) => {
  validateVisitorSignupRequest(data);

  const existingVisitorSignup = await db.visitorSignup.findUnique({
    where: {
      mobile_number: data.mobile_number,
    },
  });

  if (existingVisitorSignup) {
    throw new ApiError(httpStatus.CONFLICT, VISITOR_AUTH_ERRORS.MOBILE_EXISTS);
  }

  const hashedPassword = await hashPassword(data.password);

  const visitorRole = await db.role.findUnique({
    where: {
      name: 'VISITOR',
    },
  });

  if (!visitorRole) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Visitor role not found');
  }

  const visitorSignup = await db.visitorSignup.create({
    data: {
      name: data.name,
      mobile_number: data.mobile_number,
      password: hashedPassword,
      roleId: visitorRole.id,
    },
  });

  const visitorResponse = createVisitorSignupResponse(visitorSignup);

  return { visitor: visitorResponse };
};

const visitorLoginHandler = async (data) => {
  if (!data.mobile_number) {
    throw new ApiError(httpStatus.BAD_REQUEST, VISITOR_AUTH_ERRORS.MOBILE_REQUIRED);
  }

  if (!data.password) {
    throw new ApiError(httpStatus.BAD_REQUEST, VISITOR_AUTH_ERRORS.PASSWORD_REQUIRED);
  }

  const visitorSignup = await db.visitorSignup.findUnique({
    where: {
      mobile_number: data.mobile_number,
    },
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!visitorSignup) {
    throw new ApiError(httpStatus.NOT_FOUND, VISITOR_AUTH_ERRORS.USER_NOT_FOUND);
  }

  const isPasswordMatch = await comparePassword(data.password, visitorSignup.password);

  if (!isPasswordMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, VISITOR_AUTH_ERRORS.PASSWORD_MISMATCH);
  }

  const accessToken = generateAccessToken({
    id: visitorSignup.id,
    role: visitorSignup.role.name,
  });

  const visitorResponse = createVisitorSignupResponse(visitorSignup);

  return {
    visitor: visitorResponse,
    accessToken,
  };
};

const visitorAuthService = {
  visitorSignupHandler,
  visitorLoginHandler,
};

module.exports = visitorAuthService;
