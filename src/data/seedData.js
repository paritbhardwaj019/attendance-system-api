const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const getAttendanceRecords = async (startDate, endDate) => {
  return {
    data: {
      results: [
        {
          id: 1,
          employeeNo: 'CONTRACTOR-2-LABOUR-3',
          status: 'PRESENT',
          inTime: '2023-10-01T08:00:00Z',
          outTime: '2023-10-01T17:00:00Z',
          workingHours: 8.5,
        },
        {
          id: 2,
          employeeNo: 'CONTRACTOR-2-LABOUR-4',
          status: 'PRESENT',
          inTime: '2023-10-01T08:30:00Z',
          outTime: '2023-10-01T17:30:00Z',
          workingHours: 9.0,
        },
        {
          id: 3,
          employeeNo: 'CONTRACTOR-2-LABOUR-5',
          status: 'ABSENT',
          inTime: null,
          outTime: null,
          workingHours: 0,
        },
        {
          id: 4,
          employeeNo: 'CONTRACTOR-2-LABOUR-6',
          status: 'PRESENT',
          inTime: '2023-10-01T09:00:00Z',
          outTime: '2023-10-01T18:00:00Z',
          workingHours: 8.0,
        },
        {
          id: 5,
          employeeNo: 'CONTRACTOR-2-LABOUR-7',
          status: 'PRESENT',
          inTime: '2023-10-01T07:45:00Z',
          outTime: '2023-10-01T16:45:00Z',
          workingHours: 8.0,
        },
      ],
    },
  };
};

const createContractor = async (contractorData) => {
  try {
    const { photos, pdfs, firm_name, aadhar_number, ...userDetails } = contractorData;

    const existingUser = await db.user.findUnique({
      where: { username: userDetails.username },
    });

    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, 'Username already exists');
    }

    const user = await db.user.create({
      data: {
        ...userDetails,
        password: userDetails.password,
        role: { connect: { name: 'CONTRACTOR' } },
      },
    });

    const employeeNo = `CONTRACTOR-${user.id}`;

    const contractor = await db.contractor.create({
      data: {
        user: { connect: { id: user.id } },
        firm_name,
        employeeNo,
        aadhar_number,
        createdBy: { connect: { id: 1 } },
        updatedBy: { connect: { id: 1 } },
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

    console.log(`Contractor ${userDetails.name} created successfully.`);
    return contractor;
  } catch (error) {
    console.error('Error creating contractor:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create contractor: ' + error.message);
  }
};

const createLabours = async (contractorId, laboursData) => {
  try {
    const contractor = await db.contractor.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
    }

    for (const labourData of laboursData) {
      const { photos, pdfs, aadhar_number, fingerprint_data, ...userDetails } = labourData;

      const user = await db.user.create({
        data: {
          ...userDetails,
          password: userDetails.password,
          role: { connect: { name: 'LABOUR' } },
        },
      });

      const employeeNo = userDetails.username === 'ashish_kumar' ? '1002' : `${contractor.employeeNo}-LABOUR-${user.id}`;

      const labour = await db.labour.create({
        data: {
          user: { connect: { id: user.id } },
          contractor: { connect: { id: contractorId } },
          employeeNo,
          aadhar_number,
          fingerprint_data,
          createdBy: { connect: { id: 1 } },
          updatedBy: { connect: { id: 1 } },
        },
      });

      if (photos.length > 0) {
        await db.labourPhoto.createMany({
          data: photos.map((url) => ({
            url,
            labourId: labour.id,
          })),
        });
      }

      if (pdfs.length > 0) {
        await db.labourPDF.createMany({
          data: pdfs.map((url) => ({
            url,
            labourId: labour.id,
          })),
        });
      }

      console.log(`Labour ${userDetails.name} created successfully under contractor ${contractor.firm_name}.`);
    }

    console.log('All labours created successfully.');
  } catch (error) {
    console.error('Error creating labours:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create labours: ' + error.message);
  }
};

const seedAll = async () => {
  try {
    const contractor = await createContractor({
      name: 'John Doe',
      username: 'john_doe',
      password: 'password123',
      mobile_number: '1234567890',
      firm_name: 'Doe Constructions',
      aadhar_number: '123412341234',
      photos: [],
      pdfs: [],
    });

    await createLabours(contractor.id, [
      {
        name: 'Labour 1',
        username: 'labour_1',
        password: 'password123',
        mobile_number: '1111111111',
        aadhar_number: '111111111111',
        fingerprint_data: 'fingerprint1',
        photos: [],
        pdfs: [],
      },
      {
        name: 'Labour 2',
        username: 'labour_2',
        password: 'password123',
        mobile_number: '2222222222',
        aadhar_number: '222222222222',
        fingerprint_data: 'fingerprint2',
        photos: [],
        pdfs: [],
      },
      {
        name: 'Labour 3',
        username: 'labour_3',
        password: 'password123',
        mobile_number: '3333333333',
        aadhar_number: '333333333333',
        fingerprint_data: 'fingerprint3',
        photos: [],
        pdfs: [],
      },
      {
        name: 'Labour 4',
        username: 'labour_4',
        password: 'password123',
        mobile_number: '4444444444',
        aadhar_number: '444444444444',
        fingerprint_data: 'fingerprint4',
        photos: [],
        pdfs: [],
      },
      {
        name: 'Labour 5',
        username: 'labour_5',
        password: 'password123',
        mobile_number: '5555555555',
        aadhar_number: '555555555555',
        fingerprint_data: 'fingerprint5',
        photos: [],
        pdfs: [],
      },
      {
        name: 'Ashish Kumar',
        username: 'ashish_kumar',
        password: 'password123',
        mobile_number: '555555555512321',
        aadhar_number: '555555555555123',
        fingerprint_data: 'fingerprint6',
        photos: [],
        pdfs: [],
      },
    ]);

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await db.$disconnect();
  }
};

seedAll();

module.exports = {
  getAttendanceRecords,
  seedAll,
};
