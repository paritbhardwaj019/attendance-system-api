const httpStatus = require('http-status');
const db = require('../database/prisma');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/utils');
const { ROLES } = require('../config/roles');
const { uploadMultipleFilesToS3 } = require('./s3.service');
const { getNextCode } = require('./systemCode.service');
const { ModuleType } = require('@prisma/client');
const cameraService = require('./camera.service');

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

    const employeeNo = await getNextCode('CONTRACTOR');

    const contractorRecord = await tx.contractor.create({
      data: {
        user: { connect: { id: user.id } },
        firm_name: contractorData.firm_name,
        employeeNo,
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

    await cameraService.addUserToCamera(employeeNo, user.name);

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

  const existingUser = await db.user.findUnique({
    where: {
      username: labourData.username,
    },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, 'Username already exists');
  }

  if (labourData.aadhar_number) {
    const [existingLabour, existingPerson] = await Promise.all([
      db.labour.findUnique({
        where: {
          aadhar_number: labourData.aadhar_number,
        },
      }),
    ]);

    if (existingLabour || existingPerson) {
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

    contractor = await db.contractor.findUnique({
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

  const [photoUrls, pdfUrls] = await Promise.all([
    uploadMultipleFilesToS3(files.photos, 'labour-photos'),
    uploadMultipleFilesToS3(files.pdfs, 'labour-pdfs'),
  ]);

  let createdLabour = null;

  try {
    createdLabour = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: labourData.name,
          username: labourData.username,
          password: await hashPassword(labourData.password),
          mobile_number: labourData.mobile_number,
          role: { connect: { name: ROLES.LABOUR } },
        },
      });

      const employeeNo = await getNextCode('LABOUR');

      const labourRecord = await tx.labour.create({
        data: {
          user: { connect: { id: user.id } },
          employeeNo,
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

      await cameraService.addUserToCamera(employeeNo, user.name);

      return labourRecord;
    });

    return createdLabour;
  } catch (error) {
    if (createdLabour) {
      await db.$transaction(async (tx) => {
        await tx.labour.delete({
          where: { id: createdLabour.id },
        });
        await tx.user.delete({
          where: { id: createdLabour.user.id },
        });
      });
    }
    throw error;
  }
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

const editContractorHandler = async (loggedInUser, contractorId, contractorData, files) => {
  const existingContractor = await db.contractor.findFirst({
    where: {
      id: contractorId,
      ...(await getBaseWhereClause(loggedInUser, 'contractor')),
    },
    include: {
      user: true,
      photos: true,
      pdfs: true,
    },
  });

  if (!existingContractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found or access denied');
  }

  if (contractorData.username && contractorData.username !== existingContractor.user.username) {
    const existingUsername = await db.user.findUnique({
      where: { username: contractorData.username },
    });

    if (existingUsername) {
      throw new ApiError(httpStatus.CONFLICT, 'Username already exists');
    }
  }

  if (contractorData.aadhar_number && contractorData.aadhar_number !== existingContractor.aadhar_number) {
    const existingAadhar = await db.contractor.findUnique({
      where: { aadhar_number: contractorData.aadhar_number },
    });

    if (existingAadhar) {
      throw new ApiError(httpStatus.CONFLICT, 'Aadhar number already exists');
    }
  }

  let managerId = existingContractor.managerId;
  if (contractorData.managerId && contractorData.managerId !== existingContractor.managerId) {
    const manager = await db.manager.findUnique({
      where: { id: contractorData.managerId },
    });
    if (!manager) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Specified manager not found');
    }
    managerId = manager.id;
  }

  const [photoUrls, pdfUrls] = await Promise.all([
    files?.photos ? uploadMultipleFilesToS3(files.photos, 'contractor-photos') : [],
    files?.pdfs ? uploadMultipleFilesToS3(files.pdfs, 'contractor-pdfs') : [],
  ]);

  const updatedContractor = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existingContractor.user.id },
      data: {
        name: contractorData.name || existingContractor.user.name,
        username: contractorData.username || existingContractor.user.username,
        email: contractorData.email || existingContractor.user.email,
        ...(contractorData.password && { password: await hashPassword(contractorData.password) }),
        mobile_number: contractorData.mobile_number || existingContractor.user.mobile_number,
      },
    });

    const contractorRecord = await tx.contractor.update({
      where: { id: contractorId },
      data: {
        firm_name: contractorData.firm_name || existingContractor.firm_name,
        aadhar_number: contractorData.aadhar_number || existingContractor.aadhar_number,
        managerId,
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

  return updatedContractor;
};

/**
 * Delete contractor with dynamic access control
 */
const deleteContractorHandler = async (loggedInUser, contractorId) => {
  const contractor = await db.contractor.findFirst({
    where: {
      id: contractorId,
      ...(await getBaseWhereClause(loggedInUser, 'contractor')),
    },
    include: {
      user: true,
      photos: true,
      pdfs: true,
      labour: {
        select: { id: true },
      },
    },
  });

  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found or access denied');
  }

  if (contractor.labour.length > 0) {
    throw new ApiError(httpStatus.CONFLICT, 'Cannot delete contractor with associated labour');
  }

  await db.$transaction(async (tx) => {
    if (contractor.photos.length > 0) {
      await tx.contractorPhoto.deleteMany({
        where: { contractorId },
      });
    }

    if (contractor.pdfs.length > 0) {
      await tx.contractorPDF.deleteMany({
        where: { contractorId },
      });
    }

    await tx.contractor.delete({
      where: { id: contractorId },
    });

    await tx.user.delete({
      where: { id: contractor.userId },
    });
  });

  await cameraService.deleteUserFromCamera(contractor.employeeNo);
  // if (contractor.photos.length > 0) {
  //   await cameraService.deleteFacePictureFromCamera(contractor.employeeNo);
  // }

  return { message: 'Contractor deleted successfully' };
};

/**
 * Delete labour with dynamic access control
 */
const deleteLabourHandler = async (loggedInUser, labourId) => {
  const labour = await db.labour.findFirst({
    where: {
      id: labourId,
      ...(await getBaseWhereClause(loggedInUser, 'labour')),
    },
    include: {
      user: true,
      photos: true,
      pdfs: true,
    },
  });

  if (!labour) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Labour not found or access denied');
  }

  await db.$transaction(async (tx) => {
    if (labour.photos.length > 0) {
      await tx.labourPhoto.deleteMany({
        where: { labourId },
      });
    }

    if (labour.pdfs.length > 0) {
      await tx.labourPDF.deleteMany({
        where: { labourId },
      });
    }

    await tx.labour.delete({
      where: { id: labourId },
    });

    await tx.user.delete({
      where: { id: labour.userId },
    });
  });

  await cameraService.deleteUserFromCamera(labour.employeeNo);
  // if (labour.photos.length > 0) {
  //   await cameraService.deleteFacePictureFromCamera(labour.employeeNo);
  // }

  return { message: 'Labour deleted successfully' };
};

/**
 * Edit labour with dynamic access control
 */
const editLabourHandler = async (loggedInUser, labourId, labourData, files) => {
  const existingLabour = await db.labour.findFirst({
    where: {
      id: labourId,
      ...(await getBaseWhereClause(loggedInUser, 'labour')),
    },
    include: {
      user: true,
      contractor: true,
      photos: true,
      pdfs: true,
    },
  });

  if (!existingLabour) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Labour not found or access denied');
  }

  if (labourData.username && labourData.username !== existingLabour.user.username) {
    const existingUsername = await db.user.findUnique({
      where: { username: labourData.username },
    });

    if (existingUsername) {
      throw new ApiError(httpStatus.CONFLICT, 'Username already exists');
    }
  }

  if (labourData.aadhar_number && labourData.aadhar_number !== existingLabour.aadhar_number) {
    const existingAadhar = await db.labour.findUnique({
      where: { aadhar_number: labourData.aadhar_number },
    });

    if (existingAadhar) {
      throw new ApiError(httpStatus.CONFLICT, 'Aadhar number already exists');
    }
  }

  let contractor = null;
  if (labourData.contractorId && labourData.contractorId !== existingLabour.contractorId) {
    const contractorUser = await db.user.findUnique({
      where: { id: labourData.contractorId },
    });

    contractor = await db.contractor.findFirst({
      where: {
        user: {
          id: contractorUser.id,
        },
      },
    });

    if (!contractor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Specified contractor not found');
    }
  }

  const [photoUrls, pdfUrls] = await Promise.all([
    files?.photos ? uploadMultipleFilesToS3(files.photos, 'labour-photos') : [],
    files?.pdfs ? uploadMultipleFilesToS3(files.pdfs, 'labour-pdfs') : [],
  ]);

  const updatedLabour = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existingLabour.user.id },
      data: {
        name: labourData.name || existingLabour.user.name,
        username: labourData.username || existingLabour.user.username,
        ...(labourData.password && { password: await hashPassword(labourData.password) }),
        mobile_number: labourData.mobile_number || existingLabour.user.mobile_number,
      },
    });

    const labourRecord = await tx.labour.update({
      where: { id: labourId },
      data: {
        aadhar_number: labourData.aadhar_number || existingLabour.aadhar_number,
        fingerprint_data: labourData.fingerprint_data || existingLabour.fingerprint_data,
        ...(contractor && { contractor: { connect: { id: contractor.id } } }),
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

    if (photoUrls.length > 0) {
      await tx.labourPhoto.createMany({
        data: photoUrls.map((url) => ({
          url,
          labourId: labourRecord.id,
        })),
      });
    }

    if (pdfUrls.length > 0) {
      await tx.labourPDF.createMany({
        data: pdfUrls.map((url) => ({
          url,
          labourId: labourRecord.id,
        })),
      });
    }

    // if (files?.photos && files.photos.length > 0) {
    //   const photoBuffer = files.photos[0].buffer;
    //   await cameraService.deleteFacePictureFromCamera(existingLabour.employeeNo);
    //   await cameraService.addFacePictureToCamera(existingLabour.employeeNo, photoBuffer);
    // }

    return labourRecord;
  });

  return updatedLabour;
};

module.exports = {
  addContractorHandler,
  fetchContractorsHandler,
  addLabourHandler,
  getLabourHandler,
  editContractorHandler,
  deleteContractorHandler,
  deleteLabourHandler,
  editLabourHandler,
};
