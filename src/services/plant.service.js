const db = require('../database/prisma');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const systemCodeService = require('./systemCode.service');
const { ModuleType } = require('@prisma/client');

/**
 * Create a new plant
 * @param {Object} plantData - Plant creation data
 * @param {string} plantData.name - Plant name
 * @param {string} [plantData.plantHead] - Plant head name (optional)
 * @param {number} [plantData.plantHeadId] - Plant head user ID (optional)
 * @returns {Object} Created plant
 */
const createPlant = async (plantData) => {
  if (plantData.plantHeadId) {
    const headUser = await db.user.findUnique({
      where: { id: plantData.plantHeadId },
      include: {
        role: true,
      },
    });

    if (!headUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Plant head user not found');
    }

    const allowedRoles = ['ADMIN', 'MANAGER'];
    if (!allowedRoles.includes(headUser.role.name)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User does not have permission to be plant head');
    }

    if (!plantData.plantHead) {
      plantData.plantHead = headUser.name;
    }
  }

  const plantCode = await systemCodeService.getNextCode(ModuleType.PLANT);

  const plant = await db.$transaction(async (tx) => {
    const createdPlant = await tx.plant.create({
      data: {
        name: plantData.name,
        code: plantCode,
        plantHead: plantData.plantHead || null,
        plantHeadId: plantData.plantHeadId || null,
      },
    });

    if (plantData.plantHeadId) {
      await tx.plantMember.create({
        data: {
          plantId: createdPlant.id,
          userId: plantData.plantHeadId,
          hasAllAccess: true,
        },
      });
    }

    return createdPlant;
  });

  return plant;
};

/**
 * Update plant details
 * @param {number} plantId - Plant ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated plant
 */
const updatePlant = async (plantId, updateData) => {
  const plant = await db.plant.findUnique({
    where: { id: plantId },
  });

  if (!plant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Plant not found');
  }

  if (updateData.plantHeadId) {
    const headUser = await db.user.findUnique({
      where: { id: updateData.plantHeadId },
      include: {
        role: true,
      },
    });

    if (!headUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Plant head user not found');
    }

    await db.$transaction(async (tx) => {
      if (plant.plantHeadId) {
        await tx.plantMember.updateMany({
          where: {
            plantId,
            userId: plant.plantHeadId,
          },
          data: {
            hasAllAccess: false,
          },
        });
      }

      await tx.plantMember.upsert({
        where: {
          plantId_userId: {
            plantId,
            userId: updateData.plantHeadId,
          },
        },
        create: {
          plantId,
          userId: updateData.plantHeadId,
          hasAllAccess: true,
        },
        update: {
          hasAllAccess: true,
        },
      });
    });

    if (!updateData.plantHead) {
      updateData.plantHead = headUser.name;
    }
  }

  const updatedPlant = await db.plant.update({
    where: { id: plantId },
    data: updateData,
  });

  return updatedPlant;
};

/**
 * Delete a plant
 * @param {number} plantId - Plant ID
 * @returns {Object} Deleted plant
 */
const deletePlant = async (plantId) => {
  const hasVisitors = await db.visitor.findFirst({
    where: { plantId },
  });

  if (hasVisitors) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete plant with existing visitors');
  }

  const deletedPlant = await db.$transaction(async (tx) => {
    await tx.plantMember.deleteMany({
      where: { plantId },
    });

    return tx.plant.delete({
      where: { id: plantId },
    });
  });

  return deletedPlant;
};

/**
 * Add user to plant access
 * @param {number} plantId - Plant ID
 * @param {number} userId - User ID to add
 * @param {boolean} hasAllAccess - Whether user should have all access
 * @returns {Object} Plant member entry
 */
const addPlantMember = async (plantId, userId, hasAllAccess = false) => {
  const plant = await db.plant.findUnique({
    where: { id: plantId },
  });

  if (!plant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Plant not found');
  }

  if (plant.plantHeadId === userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot add plant head as a member. They already have access.');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const existingMember = await db.plantMember.findUnique({
    where: {
      plantId_userId: {
        plantId,
        userId,
      },
    },
  });

  if (existingMember) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already a member of this plant');
  }

  const plantMember = await db.plantMember.create({
    data: {
      plantId,
      userId,
      hasAllAccess,
    },
  });

  return plantMember;
};

/**
 * Remove user from plant access
 * @param {number} plantId - Plant ID
 * @param {number} userId - User ID to remove
 */
const removePlantMember = async (plantId, userId) => {
  const plant = await db.plant.findUnique({
    where: { id: plantId },
    include: {
      members: true,
    },
  });

  if (!plant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Plant not found');
  }

  if (plant.plantHeadId === userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot remove plant head from access');
  }

  await db.plantMember.delete({
    where: {
      plantId_userId: {
        plantId,
        userId,
      },
    },
  });
};

/**
 * Get plant visitor requests
 * @param {number} plantId - Plant ID
 * @param {Object} filters - Filter options
 * @returns {Array} List of visitor requests
 */
const getPlantVisitorRequests = async (plantId, filters = {}) => {
  const { status, startDate, endDate } = filters;

  const whereClause = { plantId };

  if (status) {
    whereClause.status = status;
  }

  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const visitors = await db.visitor.findMany({
    where: whereClause,
    include: {
      photos: true,
      entries: true,
      approvedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return visitors;
};

/**
 * Get all plants with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} filters.name - Filter by plant name
 * @param {string} filters.code - Filter by plant code
 * @param {number} filters.plantHeadId - Filter by plant head
 * @returns {Array} List of plants
 */
const getPlants = async (filters = {}) => {
  const { name, code, plantHeadId } = filters;

  const whereClause = {};

  if (name) {
    whereClause.name = { contains: name };
  }

  if (code) {
    whereClause.code = { contains: code };
  }

  if (plantHeadId) {
    whereClause.plantHeadId = plantHeadId;
  }

  const plants = await db.plant.findMany({
    where: whereClause,
    include: {
      headUser: {
        select: {
          name: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          visitors: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return plants;
};

/**
 * Check if user has access to plant
 * @param {number} plantId - Plant ID
 * @param {number} userId - User ID
 * @returns {Object} Access details
 */
const checkPlantAccess = async (plantId, userId) => {
  const member = await db.plantMember.findUnique({
    where: {
      plantId_userId: {
        plantId,
        userId,
      },
    },
  });

  return {
    hasAccess: !!member,
    hasAllAccess: member?.hasAllAccess || false,
  };
};

const plantService = {
  createPlant,
  updatePlant,
  deletePlant,
  getPlantVisitorRequests,
  getPlants,
  addPlantMember,
  removePlantMember,
  checkPlantAccess,
};
module.exports = plantService;
