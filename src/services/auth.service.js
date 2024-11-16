const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { createToken, comparePassword } = require('../utils/utils');
const config = require('../config/config');

/**
 * Generates a JWT access token.
 * @param {Object} payload - The payload to encode in the token (e.g., userId and role).
 * @returns {string} - Returns the generated access token.
 */

function generateAccessToken(payload) {
  return createToken(payload, config.jwt.secret, '24h');
}

/**
 * Authenticates a user by checking their username and password.
 * @param {<Object>} data - Consists of username and password in the body
 * @returns {Promise<Object>} - Returns an object containing user ID, user type, and auth token.
 * @throws {Error} - Throws an error if credentials are invalid.
 */

const loginWithUserNameHandler = async (data) => {
  const user = await db.user.findUnique({
    where: {
      username: data.username,
    },
    select: {
      role: {
        select: {
          name: true,
        },
      },
      password: true,
      mobile_number: true,
      name: true,
      username: true,
      id: true,
    },
  });

  if (!user || !user.password) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid credentials');

  const isPasswordMatch = comparePassword(data.password, user.password);

  if (!isPasswordMatch) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid credentials');

  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role.name,
  });

  delete user.password;

  return { user, accessToken };
};

const authService = {
  loginWithUserNameHandler,
};

module.exports = authService;
