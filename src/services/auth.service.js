const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { createToken, comparePassword, verifyToken } = require('../utils/utils');
const config = require('../config/config');

/**
 * Generates a JWT access token.
 * @param {Object} payload - The payload to encode in the token (e.g., userId and role).
 * @returns {string} - Returns the generated access token.
 */

function generateAccessToken(payload) {
  return createToken(payload, config.jwt.secret, '15m');
}

/**
 * Generates a JWT refresh token.
 * @param {Object} payload - The payload to encode in the token (e.g., userId).
 * @returns {string} - Returns the generated refresh token.
 */

function generateRefreshToken(payload) {
  return createToken(payload, config.jwt.refreshTokenSecret, '7d');
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
    },
  });

  if (!user || !user.password) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid credentials');

  const isPasswordMatch = comparePassword(data.password, user.password);

  if (!isPasswordMatch) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid credentials');

  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role.name,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
  });

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      refreshToken,
    },
  });

  delete user.password;

  return { user, accessToken, refreshToken };
};

/**
 * Verifies and refreshes the access token using a valid refresh token.
 * @param {string} refreshToken - The refresh token to verify and use for refreshing.
 * @returns {Promise<Object>} - Returns a new access token.
 * @throws {Error} - Throws an error if the refresh token is invalid or expired.
 */

const refreshAccessTokenHandler = async (refreshToken) => {
  const decodedToken = verifyToken(refreshToken, config.jwt.refreshTokenSecret);

  const user = await db.user.findUnique({ where: { id: decodedToken.id }, include: { role: true } });

  if (!user || user.refreshToken !== refreshToken) throw new ApiError('Invalid refresh token');

  const newAccessToken = generateAccessToken({
    id: user.id,
    role: user.role.name,
  });

  const newRefreshToken = generateRefreshToken({
    id: user.id,
  });

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      refreshToken,
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const authService = {
  loginWithUserNameHandler,
  refreshAccessTokenHandler,
};

module.exports = authService;
