const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const generatePassword = require('generate-password');
const { roles } = require('../config/roles');

/**
 * Creates a new user with role-specific records.
 * @param {Object} data - The user data from the request body.
 * @returns {Promise<Object>} - The created user object.
 * @throws {ApiError} - If the user already exists or if creation fails.
 */

const createUserHandler = async (data) => {
  const { name, username, roleId, mobile_number, firm_name, contractorId, fingerprint_data } = data;

  const doesExist = await db.user.findUnique({
    where: {
      username: username,
    },
  });

  if (doesExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists');
  }

  const password = generatePassword.generate({
    length: 10,
    numbers: true,
    symbols: true,
    uppercase: true,
    lowercase: true,
  });

  const role = await db.role.findUnique({
    where: { id: roleId },
    select: { name: true },
  });

  if (!role) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid roleId provided');
  }

  const roleName = role.name;

  const result = await db.$transaction(async (prisma) => {
    const user = await prisma.user.create({
      data: {
        name,
        username,
        password,
        mobile_number,
        role: {
          connect: { id: roleId },
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    switch (roleName) {
      case roles.manager:
        await prisma.manager.create({
          data: {
            userId: user.id,
          },
        });
        break;

      case roles.contractor:
        await prisma.contractor.create({
          data: {
            userId: user.id,
            firm_name: firm_name || null,
            managerId: contractorId || null,
          },
        });
        break;

      case roles.staff:
        if (!contractorId) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'contractorId is required for Staff');
        }

        const contractor = await prisma.contractor.findUnique({
          where: { id: contractorId },
        });

        if (!contractor) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid contractorId provided');
        }

        await prisma.staff.create({
          data: {
            userId: user.id,
            contractorId: contractorId,
            fingerprint_data: fingerprint_data || '',
          },
        });
        break;

      default:
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role');
    }

    // TODO: SEND EMAIL CREDS (password)

    return { user };
  });

  return result;
};

/**
 * Fetches all users with pagination for Admin role.
 * @param {number} page - Current page number.
 * @param {number} limit - Number of users per page.
 * @returns {Promise<Object>} - Paginated users and metadata.
 */

const fetchAllUsersForAdmin = async (page, limit) => {
  const skip = (page - 1) * limit;

  const [totalUsers, allUsers] = await db.$transaction([
    db.user.count(),
    db.user.findMany({
      skip,
      take: limit,
      include: {
        role: true,
        admin: true,
        manager: true,
        contractor: true,
        staff: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  return {
    data: allUsers,
    meta: {
      total: totalUsers,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Fetches Contractors managed by a specific Manager with pagination.
 * @param {number} id - ID of loggedIn user.
 * @param {number} page - Current page number.
 * @param {number} limit - Number of contractors per page.
 * @returns {Promise<Object>} - Paginated contractors and metadata.
 */

const fetchAllContractorsForManager = async (page, limit, id) => {
  const skip = (page - 1) * limit;

  const [totalContractors, allContractors] = await db.$transaction([
    db.contractor.count({
      where: {
        manager: {
          id,
        },
      },
    }),
    db.contractor.findMany({
      where: {
        manager: {
          id,
        },
      },
      skip,
      take: limit,
      include: {
        user: true,
        staff: true,
        manager: {
          include: { user: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  const totalPages = Math.ceil(totalContractors / limit);

  return {
    data: allContractors,
    meta: {
      total: totalContractors,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Fetches Staff managed by a specific Contractor with pagination.
 * @param {number} id - ID of the Contractor.
 * @param {number} page - Current page number.
 * @param {number} limit - Number of staff per page.
 * @returns {Promise<Object>} - Paginated staff and metadata.
 */

const fetchAllStaffForContractor = async (id, page, limit) => {
  const skip = (page - 1) * limit;

  const [totalStaff, allStaff] = await db.$transaction([
    await db.staff.count({
      where: {
        contractor: {
          id,
        },
      },
    }),
    await db.staff.findMany({
      skip,
      take: limit,
      include: {
        user: true,
        contractor: {
          include: { user: true },
        },
        attendance: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: allStaff,
    meta: {
      total: totalStaff,
      page,
      limit,
      totalPages,
    },
  };
};

const userService = { createUserHandler, fetchAllUsersForAdmin, fetchAllContractorsForManager, fetchAllStaffForContractor };

module.exports = userService;
