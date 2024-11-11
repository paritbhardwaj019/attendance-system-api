const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Generates a JWT token.
 * @param {Object} payload - The payload to encode in the token.
 * @param {string} secret - The secret key to sign the token.
 * @param {string} expiresIn - Expiration time for the token (e.g., '15m' for 15 minutes).
 * @returns {string} - The generated token.
 */
function createToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verifies a JWT token.
 * @param {string} token - The token to verify.
 * @param {string} secret - The secret key used to verify the token.
 * @returns {Object} - Decoded payload if verification succeeds.
 * @throws {Error} - Throws an error if verification fails.
 */

function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hashes a plain text password.
 * @param {string} password - The plain text password to hash.
 * @returns {Promise<string>} - Returns the hashed password.
 */

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * Compares a plain text password with a hashed password.
 * @param {string} password - The plain text password.
 * @param {string} hashedPassword - The hashed password to compare against.
 * @returns {Promise<boolean>} - Returns true if passwords match, false otherwise.
 */

async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

module.exports = { createToken, verifyToken, hashPassword, comparePassword };
