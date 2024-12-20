const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/utils');
const { ROLES } = require('../config/roles');
const { uploadMultipleFilesToS3 } = require('./s3.service');

/**
 * Get base where clause for dynamic access control
 * @param {Object} loggedInUser - The logged-in user
 * @param {string} type - Entity type ('contractor' or 'labour')
 * @returns {Object} Prisma where clause
 */
const getBaseWhereClause = async (loggedInUser, type) => {
  const whereClause = {};

  switch (loggedInUser.role) {
    case ROLES.ADMIN:
      whereClause.createdById = loggedInUser.id;
      break;

    case ROLES.MANAGER: {
      const manager = await db.manager.findUnique({
        where: { userId: loggedInUser.id },
        select: { id: true },
      });

      if (type === 'contractor') {
        whereClause.managerId = manager.id;
      } else if (type === 'labour') {
        whereClause.contractor = {
          managerId: manager.id,
        };
      }
      break;
    }
  }

  return whereClause;
};

/**
 * Add a new contractor with dynamic access control
 */
const addContractorHandler = async (loggedInUser, contractorData, files) => {
  if (!contractorData || !contractorData.name || !contractorData.username || !contractorData.password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required fields');
  }

  const existingUsername = await db.user.findUnique({
    where: { username: contractorData.username },
  });

  if (existingUsername) {
    throw new ApiError(httpStatus.CONFLICT, 'Username already exists');
  }

  if (contractorData.aadhar_number) {
    const existingAadhar = await db.contractor.findUnique({
      where: { aadhar_number: contractorData.aadhar_number },
    });

    if (existingAadhar) {
      throw new ApiError(httpStatus.CONFLICT, 'Aadhar number already exists');
    }
  }

  let managerId = null;
  if (loggedInUser.role.name === ROLES.MANAGER) {
    const manager = await db.manager.findUnique({
      where: { userId: loggedInUser.id },
    });
    if (!manager) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Manager not found');
    }
    managerId = manager.id;
  } else if (contractorData.managerId) {
    const manager = await db.manager.findUnique({
      where: { id: contractorData.managerId },
    });
    if (!manager) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Specified manager not found');
    }
    managerId = manager.id;
  }

  const [photoUrls, pdfUrls] = await Promise.all([
    uploadMultipleFilesToS3(files.photos, 'contractor-photos'),
    uploadMultipleFilesToS3(files.pdfs, 'contractor-pdfs'),
  ]);

  const contractor = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: contractorData.name,
        username: contractorData.username,
        email: contractorData.email,
        password: await hashPassword(contractorData.password),
        mobile_number: contractorData.mobile_number,
        role: { connect: { name: ROLES.CONTRACTOR } },
      },
      select: {
        id: true,
        name: true,
        username: true,
        mobile_number: true,
        role: true,
      },
    });

    const contractorRecord = await tx.contractor.create({
      data: {
        user: { connect: { id: user.id } },
        firm_name: contractorData.firm_name,
        aadhar_number: contractorData.aadhar_number,
        ...(managerId && { manager: { connect: { id: managerId } } }),
        createdBy: { connect: { id: loggedInUser.id } },
        updatedBy: { connect: { id: loggedInUser.id } },
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
        createdBy: {
          select: {
            name: true,
            username: true,
          },
        },
      },
    });

    if (photoUrls.length > 0) {
      await tx.contractorPhoto.createMany({
        data: photoUrls.map((url) => ({
          url,
          contractorId: contractorRecord.id,
        })),
      });
    }

    if (pdfUrls.length > 0) {
      await tx.contractorPDF.createMany({
        data: pdfUrls.map((url) => ({
          url,
          contractorId: contractorRecord.id,
        })),
      });
    }

    return contractorRecord;
  });

  const { password, ...contractorWithoutPassword } = contractor;
  return contractorWithoutPassword;
};
/**
 * Fetch contractors with dynamic access control
 */
const fetchContractorsHandler = async (filters = {}, loggedInUser) => {
  const { search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = filters;

  let whereClause = {};

  if (loggedInUser.role === ROLES.ADMIN) {
    whereClause = {
      createdById: loggedInUser.id,
    };
  } else if (loggedInUser.role === ROLES.MANAGER) {
    whereClause = {
      OR: [
        { createdById: loggedInUser.id },
        {
          manager: {
            userId: loggedInUser.id,
          },
        },
      ],
    };
  }

  if (search) {
    whereClause = {
      AND: [
        whereClause,
        {
          OR: [
            { user: { name: { contains: search } } },
            { user: { username: { contains: search } } },
            { user: { mobile_number: { contains: search } } },
          ],
        },
      ],
    };
  }

  // Execute query with pagination
  const [contractors, total] = await Promise.all([
    db.contractor.findMany({
      where: whereClause,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.contractor.count({ where: whereClause }),
  ]);

  const enhancedContractors = contractors.map((contractor) => ({
    ...contractor,
    isCreatedByMe: contractor.createdById === loggedInUser.id,
    isAssignedToMe: loggedInUser.role.name === ROLES.MANAGER && contractor.manager?.userId === loggedInUser.id,
  }));

  return {
    data: enhancedContractors,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
/**
 * Add labour with dynamic access control
 */
const addLabourHandler = async (loggedInUser, contractorId, labourData, files) => {
  if (!labourData || !labourData.name || !labourData.username || !labourData.password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required fields');
  }

  // Move validations outside transaction
  const existingUser = await db.user.findFirst({
    where: {
      username: labourData.username,
    },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, 'Username already exists');
  }

  if (labourData.aadhar_number) {
    const existingLabour = await db.labour.findFirst({
      where: {
        aadhar_number: labourData.aadhar_number,
      },
    });

    if (existingLabour) {
      throw new ApiError(httpStatus.CONFLICT, 'Aadhar number already registered');
    }
  }

  let contractor = null;
  if (contractorId) {
    const newContractorId = await db.user.findUnique({
      where: {
        id: contractorId,
      },
    });

    contractor = await db.contractor.findFirst({
      where: {
        user: {
          id: newContractorId.id,
        },
      },
    });

    if (!contractor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found or access denied');
    }
  }

  // Move file uploads outside transaction
  const [photoUrls, pdfUrls] = await Promise.all([
    uploadMultipleFilesToS3(files.photos, 'labour-photos'),
    uploadMultipleFilesToS3(files.pdfs, 'labour-pdfs'),
  ]);

  // Increase timeout and optimize transaction
  const labour = await db.$transaction(
    async (tx) => {
      const user = await tx.user.create({
        data: {
          name: labourData.name,
          username: labourData.username,
          password: await hashPassword(labourData.password),
          mobile_number: labourData.mobile_number,
          role: { connect: { name: ROLES.LABOUR } },
        },
      });

      const labourRecord = await tx.labour.create({
        data: {
          user: { connect: { id: user.id } },
          ...(contractor && { contractor: { connect: { id: contractor.id } } }),
          fingerprint_data: labourData.fingerprint_data,
          aadhar_number: labourData.aadhar_number,
          createdBy: { connect: { id: loggedInUser.id } },
          updatedBy: { connect: { id: loggedInUser.id } },
          ...(photoUrls.length > 0 && {
            photos: {
              createMany: {
                data: photoUrls.map((url) => ({ url })),
              },
            },
          }),
          ...(pdfUrls.length > 0 && {
            pdfs: {
              createMany: {
                data: pdfUrls.map((url) => ({ url })),
              },
            },
          }),
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
          photos: true,
          pdfs: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });

      return labourRecord;
    },
    {
      timeout: 10000,
      maxWait: 5000,
    }
  );

  return labour;
};
/**
 * Fetch labour with dynamic access control
 */
const getLabourHandler = async (filters = {}, loggedInUser) => {
  const { search, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10, contractorId } = filters;

  const baseWhereClause = await getBaseWhereClause(loggedInUser, 'labour');

  const whereClause = {
    ...baseWhereClause,
    ...(contractorId && { contractorId }),
    ...(search && {
      OR: [
        { user: { name: { contains: search } } },
        { user: { username: { contains: search } } },
        { user: { mobile_number: { contains: search } } },
      ],
    }),
  };

  const [labour, total] = await Promise.all([
    db.labour.findMany({
      where: whereClause,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.labour.count({ where: whereClause }),
  ]);

  return {
    data: labour,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  addContractorHandler,
  fetchContractorsHandler,
  addLabourHandler,
  getLabourHandler,
};
