const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/utils');
const { getNextCode } = require('../services/systemCode.service');

const createContractor = async (contractorData) => {
  let user, contractor;
  try {
    const { photos, pdfs, firm_name, aadhar_number, ...userDetails } = contractorData;

    const existingUser = await db.user.findUnique({
      where: { username: userDetails.username },
    });

    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, 'Username already exists');
    }

    const admin = await db.user.findFirst({
      where: {
        role: {
          name: 'ADMIN',
        },
      },
    });

    if (!admin) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found');
    }

    const hashedPassword = await hashPassword(userDetails.password);

    // Start a transaction
    user = await db.user.create({
      data: {
        ...userDetails,
        password: hashedPassword,
        role: { connect: { name: 'CONTRACTOR' } },
      },
    });

    const employeeNo = await getNextCode('CONTRACTOR');

    contractor = await db.contractor.create({
      data: {
        user: { connect: { id: user.id } },
        firm_name,
        employeeNo,
        aadhar_number,
        createdBy: { connect: { id: user.id } },
        updatedBy: { connect: { id: user.id } },
      },
    });

    if (photos.length > 0) {
      await db.contractorPhoto.createMany({
        data: photos.map((url) => ({
          url,
          contractorId: contractor.id,
        })),
      });
    }

    if (pdfs.length > 0) {
      await db.contractorPDF.createMany({
        data: pdfs.map((url) => ({
          url,
          contractorId: contractor.id,
        })),
      });
    }

    console.log(`Contractor ${userDetails.name} created successfully with employeeNo: ${employeeNo}.`);
    return contractor;
  } catch (error) {
    console.error('Error creating contractor:', error);

    // Cleanup: Delete any partially created records
    if (contractor) {
      await db.contractor.delete({ where: { id: contractor.id } }).catch(() => {});
    }
    if (user) {
      await db.user.delete({ where: { id: user.id } }).catch(() => {});
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create contractor: ' + error.message);
  }
};

const updateLaboursWithContractor = async (contractorId, employeeNumbers) => {
  try {
    const contractor = await db.contractor.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
    }

    const admin = await db.user.findFirst({
      where: {
        role: {
          name: 'ADMIN',
        },
      },
    });

    if (!admin) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found');
    }

    for (const employeeNo of employeeNumbers) {
      const labour = await db.labour.findFirst({
        where: { employeeNo },
      });

      if (!labour) {
        throw new ApiError(httpStatus.NOT_FOUND, `Labour with employeeNo ${employeeNo} not found`);
      }

      await db.labour.update({
        where: { id: labour.id },
        data: {
          contractor: { connect: { id: contractorId } },
          updatedBy: { connect: { id: admin.id } },
        },
      });

      console.log(
        `Labour with employeeNo ${employeeNo} updated successfully and assigned to contractor ${contractor.employeeNo}.`
      );
    }

    console.log('All labours updated successfully.');
  } catch (error) {
    console.error('Error updating labours:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update labours: ' + error.message);
  }
};

const assignLaboursToContractor = async (contractorData, employeeNumbers) => {
  let contractor;
  try {
    contractor = await createContractor(contractorData);
    await updateLaboursWithContractor(contractor.id, employeeNumbers);
    console.log('Labours assigned to contractor successfully.');
  } catch (error) {
    console.error('Failed to assign labours to contractor:', error);

    if (contractor) {
      await db.contractor.delete({ where: { id: contractor.id } }).catch(() => {});
      console.log('Contractor deleted due to failure in assigning labours.');
    }

    throw error;
  }
};

const contractorData = {
  name: 'Rajesh Sharma',
  username: 'rajesh_sharma_123',
  password: 'password123',
  mobile_number: '+919876543210',
  firm_name: 'Sharma Builders Pvt. Ltd.',
  aadhar_number: '123456789012',
  photos: [],
  pdfs: [],
};

const employeeNumbers = ['LAB21', 'LAB22', 'LAB23'];

assignLaboursToContractor(contractorData, employeeNumbers)
  .then(() => {
    console.log('Labours assigned to contractor successfully.');
  })
  .catch((error) => {
    console.error('Failed to assign labours to contractor:', error);
  });
