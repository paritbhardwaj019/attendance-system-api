const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const bcrypt = require('bcryptjs');

/**
 * Creates a new user with the specified role.
 * @param {Object} data - User data including role-specific fields.
 * @param {number} createdBy - ID of the admin creating the user.
 * @returns {Promise<Object>} - Returns the created user.
 * @throws {Error} - Throws an error if user type is invalid or creation fails.
 */

const createUser = async (data, loggedInUser) => {
  const { name, username, password, user_type, mobile_number, firm_name, manager_id, contractor_id, fingerprint_data } =
    data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const role = await db.role.findUnique({
    where: { name: user_type },
  });

  if (!role) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user type');
  }

  let roleSpecificData = {};
  switch (user_type) {
    case 'Admin':
      roleSpecificData = { admin: {} };
      break;
    case 'Manager':
      roleSpecificData = { manager: {} };
      break;
    case 'Contractor':
      roleSpecificData = {
        contractor: {
          create: {
            firm_name: firm_name || null,
            managerId: manager_id || null,
          },
        },
      };
      break;
    case 'Staff':
      roleSpecificData = {
        staff: {
          create: {
            contractorId: contractor_id,
            fingerprint_data,
          },
        },
      };
      break;
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user type');
  }

  const newUser = await db.user.create({
    data: {
      name,
      username,
      password: hashedPassword,
      mobile_number: mobile_number || null,
      roleId: role.id,
      ...roleSpecificData,
    },
    include: {
      role: true,
      admin: true,
      manager: true,
      contractor: true,
      staff: true,
    },
  });

  return newUser;
};

/**
 * Deletes a user by ID.
 * @param {number} id - ID of the user to delete.
 * @returns {Promise<Object>} - Returns a success message.
 * @throws {Error} - Throws an error if user is not found.
 */

const deleteUser = async (id) => {
  const user = await db.user.findUnique({
    where: { id: id },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  await db.user.delete({
    where: { id: id },
  });

  return { message: 'User deleted successfully' };
};

/**
 * Retrieves user details by ID.
 * @param {number} id - ID of the user to retrieve.
 * @returns {Promise<Object>} - Returns the user details.
 * @throws {Error} - Throws an error if user is not found.
 */
const getUserDetails = async (id) => {
  const user = await db.user.findUnique({
    where: { id: id },
    include: {
      role: true,
      admin: true,
      manager: {
        include: { contractors: true },
      },
      contractor: {
        include: { manager: true, staff: true },
      },
      staff: {
        include: { contractor: true },
      },
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

/**
 * Lists users with optional filtering and pagination.
 * @param {Object} filters - Filters for user type and search term.
 * @param {Object} pagination - Pagination options including page and limit.
 * @returns {Promise<Object>} - Returns a paginated list of users.
 */

const listUsers = async (filters, pagination) => {
  const { skip, take, page } = pagination;
  const { user_type, search } = filters;

  const where = {};

  if (user_type) {
    const role = await db.role.findUnique({ where: { name: user_type } });
    if (role) {
      where.roleId = role.id;
    }
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const users = await db.user.findMany({
    where,
    skip,
    take,
    include: { role: true },
  });

  const total = await db.user.count({ where });

  return {
    data: users,
    total,
    page,
    limit: take,
    totalPages: Math.ceil(total / take),
  };
};

const userService = {
  createUser,
  deleteUser,
  getUserDetails,
  listUsers,
};

module.exports = userService;
