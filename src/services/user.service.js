const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/utils');
const { ROLES } = require('../config/roles');
const cameraService = require('./camera.service');
const { getNextCode } = require('./systemCode.service');
const { encrypt, decrypt } = require('../utils/encryption');
const { TABLE_HEADERS, getHeadersForView } = require('../constants/user');
const { connect } = require('mongoose');

/**
 * Handler to create a new user.
 * @param {Object} data - Data for the new user.
 * @returns {Object} Created user without password.
 */
const createUserHandler = async (data, loggedInUser) => {
  console.log('DATA', data);

  const existingUser = await db.user.findUnique({
    where: { username: data.username },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
  }

  return await db.$transaction(
    async (prisma) => {
      const hashedPassword = await hashPassword(data.password);
      const encryptedPlainPassword = encrypt(data.password);

      const user = await prisma.user.create({
        data: {
          name: data.name,
          username: data.username,
          password: hashedPassword,
          encryptedPlainPassword,
          mobile_number: data.mobile_number,
          role: {
            connect: { name: data.user_type },
          },
        },
        include: {
          role: true,
        },
      });

      let employeeNo;

      switch (data.user_type) {
        case ROLES.ADMIN:
          employeeNo = await getNextCode('ADMIN');
          await prisma.admin.create({
            data: {
              user: { connect: { id: user.id } },
              employeeNo,
            },
          });
          break;

        case ROLES.MANAGER:
          employeeNo = await getNextCode('MANAGER');
          await prisma.manager.create({
            data: {
              user: { connect: { id: user.id } },
              employeeNo,
            },
          });
          break;

        case ROLES.CONTRACTOR:
          if (!data.aadhar_number) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Aadhar number is required for Contractor');
          }

          employeeNo = await getNextCode('CONTRACTOR');
          await prisma.contractor.create({
            data: {
              user: { connect: { id: user.id } },
              firm_name: data.firm_name,
              employeeNo,
              aadhar_number: data.aadhar_number,
              createdBy: { connect: { id: loggedInUser.id } },
              updatedBy: { connect: { id: loggedInUser.id } },
              ...(data.manager_id && {
                manager: {
                  connect: {
                    id: data.manager_id,
                  },
                },
              }),
              ...(data.start_date && { startDate: new Date(data.start_date) }),
              ...(data.end_date && { endDate: new Date(data.end_date) }),
              ...(data.site_code && { siteCode: data.site_code }),
            },
          });
          break;

        case ROLES.LABOUR:
          if (!data.contractor_id || !data.fingerprint_data || !data.aadhar_number) {
            throw new ApiError(
              httpStatus.BAD_REQUEST,
              'Contractor ID, fingerprint data, and aadhar number are required for Labour'
            );
          }

          const contractor = await prisma.contractor.findUnique({
            where: { id: data.contractor_id },
          });

          if (!contractor) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid contractor ID');
          }

          employeeNo = await getNextCode('LABOUR');
          await prisma.labour.create({
            data: {
              user: { connect: { id: user.id } },
              contractor: { connect: { id: data.contractor_id } },
              fingerprint_data: data.fingerprint_data,
              aadhar_number: data.aadhar_number,
              employeeNo,
              createdBy: { connect: { id: loggedInUser.id } },
              updatedBy: { connect: { id: loggedInUser.id } },
            },
          });
          await cameraService.addUserToCamera(employeeNo, user.name);
          break;

        case ROLES.EMPLOYEE:
          if (data.plant_id) {
            const plant = await prisma.plant.findUnique({
              where: { id: data.plant_id },
            });
            if (!plant) {
              throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid plant ID');
            }
          }

          employeeNo = await getNextCode('EMPLOYEE');
          await prisma.employee.create({
            data: {
              user: { connect: { id: user.id } },
              employeeNo,
              department: data.department,
              designation: data.designation,
              ...(data.plant_id && {
                plant: {
                  connect: { id: data.plant_id },
                },
              }),
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
          labour: true,
          employee: true,
        },
      });

      if (!createdUser) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found after creation');
      }

      delete createdUser.password;
      delete createdUser.encryptedPlainPassword;
      return createdUser;
    },
    {
      timeout: 10000,
    }
  );
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
      employee: {
        select: {
          id: true,
          userId: true,
          employeeNo: true,
          department: true,
          designation: true,
          plantId: true,
        },
      },
      contractor: {
        select: {
          id: true,
          userId: true,
          firm_name: true,
          managerId: true,
          photos: {
            select: {
              id: true,
              url: true,
            },
          },
          pdfs: {
            select: {
              id: true,
              url: true,
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
        },
      },
      labour: {
        select: {
          id: true,
          userId: true,
          contractorId: true,
          fingerprint_data: true,
          photos: {
            select: {
              id: true,
              url: true,
            },
          },
          pdfs: {
            select: {
              id: true,
              url: true,
            },
          },
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

  const headers = getHeadersForView('main');
  const visibleHeaders = headers.filter((header) => {
    if (header.showIf) {
      return users.some((user) => header.showIf(user));
    }
    return true;
  });

  const transformedUsers = users.map((user) => {
    const transformedUser = { id: user.id };

    visibleHeaders.forEach((header) => {
      if (header.getValue) {
        transformedUser[header.field] = header.getValue(user);
      } else {
        transformedUser[header.field] = user[header.field];
      }
    });

    return transformedUser;
  });

  return {
    headers: visibleHeaders,
    data: transformedUsers,
    pagination: {
      total: totalUsers,
      page,
      limit,
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
      employee: true,
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
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  const user = await fetchUserByIdHandler(id);

  await db.$transaction(async (prisma) => {
    switch (user.role.name) {
      case ROLES.ADMIN:
        await prisma.admin.delete({
          where: { userId: id },
        });
        break;
      case ROLES.MANAGER:
        await prisma.manager.delete({
          where: { userId: id },
        });
        break;
      case ROLES.CONTRACTOR:
        await prisma.contractor.delete({
          where: { userId: id },
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
          where: { userId: id },
        });
        break;
      case ROLES.EMPLOYEE:
        await prisma.employee.delete({
          where: { userId: id },
        });
        break;
      default:
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user role');
    }

    await prisma.user.delete({ where: { id } });
  });

  return true;
};

const getUsersWithPasswordsHandler = async (filters = {}) => {
  const { manager = false, contractor = false, visitor = false, employee = false, search } = filters;

  const roleFilter = [];
  if (manager) roleFilter.push({ role: { name: ROLES.MANAGER } });
  if (contractor) roleFilter.push({ role: { name: ROLES.CONTRACTOR } });
  if (visitor) roleFilter.push({ role: { name: ROLES.VISITOR } });
  if (employee) roleFilter.push({ role: { name: ROLES.EMPLOYEE } });

  if (roleFilter.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Select at least one user type');
  }

  const whereClause = {
    AND: [{ OR: roleFilter }, { role: { name: { not: ROLES.LABOUR } } }],
    ...(search && {
      OR: [{ name: { contains: search } }, { username: { contains: search } }, { mobile_number: { contains: search } }],
    }),
  };

  const users = await db.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      username: true,
      mobile_number: true,
      encryptedPlainPassword: true,
      role: {
        select: {
          name: true,
        },
      },
      manager: {
        select: {
          employeeNo: true,
        },
      },
      contractor: {
        select: {
          employeeNo: true,
          firm_name: true,
        },
      },
      employee: {
        select: {
          employeeNo: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const transformedUsers = users.map((user) => ({
    ...user,
    plainPassword:
      user.encryptedPlainPassword === '-' ? '-' : user.encryptedPlainPassword ? decrypt(user.encryptedPlainPassword) : null,
    employeeNo: user.manager?.employeeNo || user.contractor?.employeeNo,
    firm_name: user.contractor?.firm_name || null,
    encryptedPlainPassword: undefined,
  }));

  const headers = getHeadersForView('password');
  const visibleHeaders = headers.filter((header) => {
    if (header.showIf) {
      return transformedUsers.some((user) => header.showIf(user));
    }
    return true;
  });

  return {
    headers: visibleHeaders,
    data: transformedUsers,
  };
};

const userService = {
  createUserHandler,
  fetchUsersHandler,
  fetchUserByIdHandler,
  deleteUserHandler,
  getUsersWithPasswordsHandler,
};

module.exports = userService;
