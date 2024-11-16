const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/utils');

/**
 * Handler to add a new contractor under a specific manager.
 * @param {number} managerUserId - The User ID of the Manager.
 * @param {Object} contractorData - Data for the new Contractor.
 * @returns {Object} The created Contractor object without the password field.
 */

const addContractorHandler = async (managerUserId, contractorData) => {
  const manager = await db.manager.findUnique({
    where: {
      userId: managerUserId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: true,
        },
      },
    },
  });

  if (!manager) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Manager not found');
  }

  const user = await db.user.create({
    data: {
      name: contractorData.name,
      username: contractorData.username,
      password: await hashPassword(contractorData.password),
      mobile_number: contractorData.mobile_number,
      role: {
        connect: { name: 'Contractor' },
      },
    },
    select: {
      id: true,
      name: true,
      username: true,
      mobile_number: true,
      role: true,
    },
  });

  const contractor = await db.contractor.create({
    data: {
      user: {
        connect: { id: user.id },
      },
      firm_name: contractorData.firm_name,
      manager: {
        connect: { id: manager.id },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: true,
        },
      },
      manager: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  delete contractor.user.password;
  delete contractor.userId;
  delete contractor.managerId;

  return contractor;
};

/**
 * Handler to fetch multiple contractors with filters, sorting, and pagination.
 * @param {Object} filters - Filters for fetching contractors.
 * @param {string} [filters.search] - Search term to search across name, username, and mobile_number.
 * @param {string} [filters.sortBy] - Field to sort by (e.g., 'name', 'username', 'createdAt').
 * @param {string} [filters.order] - Order of sorting ('asc' or 'desc').
 * @param {number} [filters.page=1] - Page number for pagination.
 * @param {number} [filters.limit=10] - Number of contractors per page.
 * @returns {Object} Object containing contractor data and pagination info.
 */

const fetchContractorsHandler = async (filters = {}, loggedInUser) => {
  let { search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = filters;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  const sortableFields = ['name', 'username', 'createdAt', 'updatedAt'];
  const sortField = sortableFields.includes(sortBy) ? sortBy : 'createdAt';

  const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;
  const take = limit;

  const whereClause = {
    manager: {
      user: {
        id: loggedInUser.id,
      },
    },
    OR: search
      ? [
          { user: { name: { contains: search } } },
          { user: { username: { contains: search } } },
          { user: { mobile_number: { contains: search } } },
        ]
      : undefined,
  };

  const contractors = await db.contractor.findMany({
    where: whereClause,
    select: {
      id: true,
      firm_name: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: {
            select: {
              id: true,
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
              id: true,
              name: true,
              username: true,
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

  const totalContractors = await db.contractor.count({
    where: whereClause,
  });

  return {
    data: contractors,
    pagination: {
      total: totalContractors,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalContractors / limit),
    },
  };
};

/**
 * Handler to add staff members under a specific contractor.
 * @param {number} loggedInUser - The User ID of the Manager.
 * @param {Object} data - Data for the new Staff member.
 * @returns {Object} The created Staff object without sensitive fields.
 */

const addStaff = async (loggedInUser, data) => {
  const manager = await db.manager.findUnique({
    where: {
      userId: loggedInUser.id ? parseInt(loggedInUser.id, 10) : loggedInUser.id,
    },
  });

  if (!manager) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Manager not found');
  }

  const contractor = await db.contractor.findFirst({
    where: {
      id: data.contractorId,
      managerId: manager.id,
    },
  });

  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found or does not belong to this manager');
  }

  const user = await db.user.create({
    data: {
      name: data.name,
      username: data.username,
      password: await hashPassword(data.password),
      mobile_number: data.mobile_number,
      role: {
        connect: { name: 'Staff' },
      },
    },
    select: {
      id: true,
      name: true,
      username: true,
      mobile_number: true,
      role: true,
    },
  });

  const staff = await db.staff.create({
    data: {
      user: {
        connect: { id: user.id },
      },
      contractor: {
        connect: { id: contractor.id },
      },
      fingerprint_data: data.fingerprint_data,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: true,
        },
      },
      contractor: {
        select: {
          id: true,
          firm_name: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  delete staff.userId;
  delete staff.contractorId;

  return staff;
};

/**
 * Handler to fetch staff members for a specific contractor with filters, sorting, and pagination.
 * @param {number} managerUserId - The User ID of the Manager.
 * @param {number} contractorId - The ID of the Contractor.
 * @param {Object} filters - Filters for fetching staff.
 * @param {string} [filters.search] - Search term to search across name, username, and mobile_number.
 * @param {string} [filters.sortBy] - Field to sort by (e.g., 'name', 'username', 'createdAt').
 * @param {string} [filters.order] - Order of sorting ('asc' or 'desc').
 * @param {number} [filters.page=1] - Page number for pagination.
 * @param {number} [filters.limit=10] - Number of staff members per page.
 * @returns {Object} Object containing staff data and pagination info.
 */

const getContractorStaff = async (loggedInUser, contractorId, filters = {}) => {
  let { search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = filters;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  const sortableFields = ['name', 'username', 'designation', 'department', 'createdAt', 'updatedAt'];
  const sortField = sortableFields.includes(sortBy) ? sortBy : 'createdAt';

  const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;
  const take = limit;

  const manager = await db.manager.findUnique({
    where: {
      userId: loggedInUser.id,
    },
  });

  if (!manager) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Manager not found');
  }

  const contractor = await db.contractor.findFirst({
    where: {
      id: parseInt(contractorId, 10),
      managerId: manager.id,
    },
  });

  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found or does not belong to this manager');
  }

  const whereClause = {
    contractorId: contractor.id,
    OR: search
      ? [
          { user: { name: { contains: search } } },
          { user: { username: { contains: search } } },
          { user: { mobile_number: { contains: search } } },
        ]
      : undefined,
  };

  const staff = await db.staff.findMany({
    where: whereClause,
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          mobile_number: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      contractor: {
        select: {
          id: true,
          firm_name: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
      fingerprint_data: true,
      attendance: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy:
      sortField === 'name' || sortField === 'username'
        ? {
            user: {
              [sortField]: sortOrder,
            },
          }
        : {
            [sortField]: sortOrder,
          },
    skip: skip,
    take: take,
  });

  const totalStaff = await db.staff.count({
    where: whereClause,
  });

  return {
    data: staff,
    pagination: {
      total: totalStaff,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalStaff / limit),
    },
  };
};

const managerService = { addContractorHandler, fetchContractorsHandler, addStaff, getContractorStaff };

module.exports = managerService;
