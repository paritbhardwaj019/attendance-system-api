const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/utils');

/**
 * Adds a new contractor under a manager.
 * @param {number} id - ID of the manager adding the contractor.
 * @param {Object} data - Contractor data.
 * @returns {Promise<Object>} - Returns the created contractor.
 * @throws {Error} - Throws an error if manager not found or creation fails.
 */

const addContractor = async (id, data) => {
  const manager = await db.manager.findUnique({
    where: { userId: id },
  });

  if (!manager) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Manager not found');
  }

  const { name, firm_name, mobile_number, password } = data;

  const hashedPassword = await hashPassword(password);

  const contractorUser = await db.user.create({
    data: {
      name,
      username: `${name.toLowerCase().replace(' ', '.')}${Date.now()}`,
      password: hashedPassword,
      mobile_number,
      roleId: (await db.role.findUnique({ where: { name: 'Contractor' } })).id,
      contractor: {
        create: {
          firm_name: firm_name || null,
          managerId: manager.id,
        },
      },
    },
    include: {
      role: true,
      contractor: true,
    },
  });

  return contractorUser;
};

/**
 * Adds a new staff under a contractor.
 * @param {number} id - ID of the manager adding the staff.
 * @param {Object} data - Staff data.
 * @returns {Promise<Object>} - Returns the created staff.
 * @throws {Error} - Throws an error if contractor not found or creation fails.
 */

const addStaff = async (id, data) => {
  const manager = await db.manager.findUnique({
    where: { userId: id },
    include: { contractors: true },
  });

  if (!manager) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Manager not found');
  }

  const { name, mobile_number, contractor_id, fingerprint_data, password } = data;

  const contractor = await db.contractor.findUnique({
    where: { id: contractor_id },
  });

  if (!contractor || contractor.managerId !== manager.id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Contractor does not belong to this manager');
  }

  const hashedPassword = await hashPassword(password);

  const staffUser = await db.user.create({
    data: {
      name,
      username: `${name.toLowerCase().replace(' ', '.')}${Date.now()}`,
      password: hashedPassword,
      mobile_number,
      roleId: (await db.role.findUnique({ where: { name: 'Staff' } })).id,
      staff: {
        create: {
          contractorId: contractor.id,
          fingerprint_data,
        },
      },
    },
    include: {
      role: true,
      staff: true,
    },
  });

  return staffUser;
};

/**
 * Lists all contractors added by the manager with pagination and filtering.
 * @param {number} managerId - ID of the manager.
 * @param {Object} filters - Filters for search.
 * @param {Object} pagination - Pagination options.
 * @returns {Promise<Object>} - Returns a paginated list of contractors.
 */

const listContractors = async (managerId, filters, pagination) => {
  const { page, limit } = pagination;
  const { search } = filters;

  const where = { managerId: managerId };

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const contractors = await db.contractor.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    include: { user: true },
  });

  const total = await db.contractor.count({ where });

  return {
    data: contractors,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Lists all staff under a specific contractor with pagination and filtering.
 * @param {number} managerId - ID of the manager.
 * @param {number} contractorId - ID of the contractor.
 * @param {Object} filters - Filters for search.
 * @param {Object} pagination - Pagination options.
 * @returns {Promise<Object>} - Returns a paginated list of staff.
 */

const listStaffUnderContractor = async (managerId, contractorId, filters, pagination) => {
  const { page, limit } = pagination;
  const { search } = filters;

  const contractor = await db.contractor.findUnique({
    where: { id: contractorId },
  });

  if (!contractor || contractor.managerId !== managerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Contractor does not belong to this manager');
  }

  const where = { contractorId: contractorId };

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const staff = await db.staff.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    include: { user: true },
  });

  const total = await db.staff.count({ where });

  return {
    data: staff,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const managerService = {
  addContractor,
  addStaff,
  listContractors,
  listStaffUnderContractor,
};

module.exports = managerService;
