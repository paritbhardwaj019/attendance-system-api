const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/utils');
const { ROLES } = require('../config/roles');

/**
 * Handler to create a new user.
 * @param {Object} userData - Data for the new user.
 * @returns {Object} Created user without password.
 */
const createUserHandler = async (userData) => {
  const existingUser = await db.user.findUnique({
    where: { username: userData.username },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
  }

  return await db.$transaction(async (prisma) => {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        username: userData.username,
        password: await hashPassword(userData.password),
        mobile_number: userData.mobile_number,
        role: {
          connect: { name: userData.user_type },
        },
      },
      include: {
        role: true,
      },
    });

    switch (userData.user_type) {
      case ROLES.ADMIN:
        await prisma.admin.create({
          data: {
            user: { connect: { id: user.id } },
          },
        });
        break;

      case ROLES.MANAGER:
        await prisma.manager.create({
          data: {
            user: { connect: { id: user.id } },
          },
        });
        break;

      case ROLES.CONTRACTOR:
        await prisma.contractor.create({
          data: {
            user: { connect: { id: user.id } },
            firm_name: userData.firm_name,
            manager: userData.manager_id
              ? {
                  connect: { id: userData.manager_id },
                }
              : undefined,
          },
        });
        break;

      case ROLES.LABOUR:
        if (!userData.contractor_id || !userData.fingerprint_data) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Contractor ID and fingerprint data required for Labour');
        }
        await prisma.labour.create({
          data: {
            user: { connect: { id: user.id } },
            contractor: { connect: { id: userData.contractor_id } },
            fingerprint_data: userData.fingerprint_data,
          },
        });
        break;

      default:
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user type');
    }

    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        role: true,
        admin: true,
        manager: true,
        contractor: {
          include: {
            manager: true,
            labour: true,
          },
        },
        labour: {
          include: {
            contractor: true,
            attendance: true,
          },
        },
      },
    });

    if (!createdUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found after creation');
    }

    delete createdUser.password;

    return createdUser;
  });
};
/**
 * Handler to fetch multiple users with filters, sorting, and pagination.
 * @param {Object} filters - Filters for fetching users.
 * @param {string} [filters.user_type] - Role name to filter users (e.g., 'Admin', 'Manager').
 * @param {string} [filters.search] - Search term to search across name, username, and mobile_number.
 * @param {string} [filters.sortBy] - Field to sort by (e.g., 'name', 'username', 'createdAt').
 * @param {string} [filters.order] - Order of sorting ('asc' or 'desc').
 * @param {number} [filters.page=1] - Page number for pagination.
 * @param {number} [filters.limit=10] - Number of users per page.
 * @returns {Array} List of users matching the filters.
 */
const fetchUsersHandler = async (filters = {}) => {
  let { user_type, search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = filters;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  const sortableFields = ['name', 'username', 'createdAt', 'updatedAt'];
  const sortField = sortableFields.includes(sortBy) ? sortBy : 'createdAt';

  const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;
  const take = limit;

  const whereClause = {
    role: user_type ? { name: user_type } : undefined,
    OR: search
      ? [{ name: { contains: search } }, { username: { contains: search } }, { mobile_number: { contains: search } }]
      : undefined,
  };

  const users = await db.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      username: true,
      mobile_number: true,
      roleId: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      admin: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      manager: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
              username: true,
            },
          },
          userId: true,
          contractors: true,
          _count: true,
        },
      },
      contractor: {
        select: {
          id: true,
          userId: true,
          firm_name: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  username: true,
                },
              },
              userId: true,
              contractors: true,
              _count: true,
            },
          },
        },
      },
      labour: {
        select: {
          id: true,
          userId: true,
          contractorId: true,
          fingerprint_data: true,
          attendance: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      [sortField]: sortOrder,
    },
    skip: skip,
    take: take,
  });

  const totalUsers = await db.user.count({
    where: whereClause,
  });

  return {
    data: users,
    pagination: {
      total: totalUsers,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalUsers / limit),
    },
  };
};

/**
 * Handler to fetch a single user by ID.
 * @param {number} userId - ID of the user to fetch.
 * @returns {Object} User object without password.
 */
const fetchUserByIdHandler = async (userId) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      admin: true,
      manager: true,
      contractor: {
        include: {
          manager: true,
          labour: true,
        },
      },
      labour: {
        include: {
          contractor: true,
          attendance: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  delete user.password;
  return user;
};

/**
 * Handler to delete a user by ID.
 * @param {number} id - ID of the user to delete.
 * @returns {boolean} True if deletion was successful.
 */

const deleteUserHandler = async (id) => {
  const user = await fetchUserByIdHandler(id);

  await db.$transaction(async (prisma) => {
    switch (user.role.name) {
      case ROLES.ADMIN:
        await prisma.admin.delete({
          where: {
            user: {
              id,
            },
          },
        });
        break;
      case ROLES.MANAGER:
        await prisma.manager.delete({
          where: {
            user: {
              id,
            },
          },
        });
        break;
      case ROLES.CONTRACTOR:
        await prisma.contractor.delete({
          where: {
            user: {
              id,
            },
          },
        });
        break;
      case ROLES.LABOUR:
        await prisma.attendance.deleteMany({
          where: {
            labour: {
              id: user.labour.id,
            },
          },
        });
        await prisma.labour.delete({
          where: {
            user: {
              id,
            },
          },
        });
        break;
      default:
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user role');
    }

    await prisma.user.delete({ where: { id } });
  });

  return true;
};

const userService = {
  createUserHandler,
  fetchUsersHandler,
  fetchUserByIdHandler,
  deleteUserHandler,
};

module.exports = userService;
