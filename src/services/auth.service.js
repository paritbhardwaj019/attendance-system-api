const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { createToken, comparePassword } = require('../utils/utils');
const config = require('../config/config');

const AUTH_ERRORS = {
  USERNAME_REQUIRED: 'Username is required',
  PASSWORD_REQUIRED: 'Password is required',
  USER_NOT_FOUND: 'User not found',
  INVALID_USERNAME: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores',
  INVALID_PASSWORD: 'Password must be between 6 and 30 characters',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support',
  INVALID_CREDENTIALS: 'Invalid credentials',
  PASSWORD_MISMATCH: 'Incorrect password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  PASSWORD_RESET_REQUIRED: 'User account requires password reset',
};

const validateLoginRequest = (data) => {
  if (!data.username) {
    throw new ApiError(httpStatus.BAD_REQUEST, AUTH_ERRORS.USERNAME_REQUIRED);
  }

  if (!data.password) {
    throw new ApiError(httpStatus.BAD_REQUEST, AUTH_ERRORS.PASSWORD_REQUIRED);
  }
};

const generateAccessToken = (payload) => createToken(payload, config.jwt.secret, '24h');

const validateUser = (user) => {
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, AUTH_ERRORS.USER_NOT_FOUND);
  }

  if (!user.password) {
    throw new ApiError(httpStatus.BAD_REQUEST, AUTH_ERRORS.PASSWORD_RESET_REQUIRED);
  }
};

const validatePassword = async (inputPassword, userPassword) => {
  const isPasswordMatch = await comparePassword(inputPassword, userPassword);
  if (!isPasswordMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, AUTH_ERRORS.PASSWORD_MISMATCH);
  }
};

const createUserResponse = (user) => {
  const response = {
    id: user.id,
    name: user.name,
    username: user.username,
    mobile_number: user.mobile_number,
    role: user.role.name,
    contractorId: null,
    employeeId: null,
    department: null,
    designation: null,
    plantId: null,
  };

  if (user.role.name === 'CONTRACTOR') {
    response.contractorId = user.contractor?.id || null;
  }

  if (user.role.name === 'EMPLOYEE' && user.employee) {
    response.employeeId = user.employee.id;
    response.department = user.employee.department;
    response.designation = user.employee.designation;
    response.plantId = user.employee.plantId;
  }

  return response;
};

const loginWithUserNameHandler = async (data) => {
  validateLoginRequest(data);

  const user = await db.user.findUnique({
    where: {
      username: data.username,
    },
    include: {
      role: {
        select: {
          name: true,
        },
      },
      contractor: {
        select: {
          id: true,
        },
      },
      employee: {
        select: {
          id: true,
          department: true,
          designation: true,
          plantId: true,
        },
      },
    },
  });

  validateUser(user);
  await validatePassword(data.password, user.password);

  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role.name,
  });

  const userResponse = createUserResponse(user);

  return { user: userResponse, accessToken };
};

const authService = {
  loginWithUserNameHandler,
};

module.exports = authService;
