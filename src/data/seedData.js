const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/roles');
const faker = require('faker');
const { hashPassword } = require('../utils/utils');
const { getNextCode } = require('../services/systemCode.service');

const formatDateWithTimezone = (date) => {
  const offset = date.getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const minutes = Math.abs(offset % 60);
  const sign = offset > 0 ? '-' : '+';
  return `${date.toISOString().slice(0, -1)}${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const generateAttendanceRecords = async (labourId, startDate, endDate) => {
  try {
    const labour = await db.labour.findUnique({
      where: { id: labourId },
      include: { user: true, contractor: true },
    });

    if (!labour) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Labour not found');
    }

    const attendanceRecords = [];
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
      const inTime = new Date(currentDate);
      inTime.setHours(7 + Math.floor(Math.random() * 4));
      inTime.setMinutes(Math.floor(Math.random() * 60));
      inTime.setSeconds(0);

      const outTime = new Date(inTime);
      outTime.setHours(16 + Math.floor(Math.random() * 5));
      outTime.setMinutes(Math.floor(Math.random() * 60));
      outTime.setSeconds(0);

      const workingHours = ((outTime - inTime) / (1000 * 60 * 60)).toFixed(1);

      const status = Math.random() > 0.1 ? 'PRESENT' : 'ABSENT';

      attendanceRecords.push({
        labourId: labour.id,
        inTime: status === 'PRESENT' ? formatDateWithTimezone(inTime) : null,
        outTime: status === 'PRESENT' ? formatDateWithTimezone(outTime) : null,
        workingHours: status === 'PRESENT' ? parseFloat(workingHours) : 0,
        date: formatDateWithTimezone(currentDate),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    await db.attendance.createMany({
      data: attendanceRecords,
    });

    console.log(
      `Attendance records generated for labour ${labour.user.name} (${labour.employeeNo}) from ${startDate} to ${endDate}.`
    );
    return attendanceRecords;
  } catch (error) {
    console.error('Error generating attendance records:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate attendance records: ' + error.message);
  }
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

    const admin = await db.user.findFirst({
      where: {
        role: {
          name: ROLES.ADMIN,
        },
      },
    });

    if (!admin) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found');
    }

    const hashedPassword = await hashPassword(userDetails.password);

    const user = await db.user.create({
      data: {
        ...userDetails,
        password: hashedPassword,
        role: { connect: { name: 'CONTRACTOR' } },
      },
    });

    const employeeNo = await getNextCode('CONTRACTOR');

    const contractor = await db.contractor.create({
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

    const admin = await db.user.findFirst({
      where: {
        role: {
          name: ROLES.ADMIN,
        },
      },
    });

    if (!admin) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found');
    }

    for (const labourData of laboursData) {
      const { photos, pdfs, aadhar_number, fingerprint_data, ...userDetails } = labourData;

      const hashedPassword = await hashPassword(userDetails.password);

      const user = await db.user.create({
        data: {
          ...userDetails,
          password: hashedPassword,
          role: { connect: { name: 'LABOUR' } },
        },
      });

      const employeeNo = await getNextCode('LABOUR');

      const labour = await db.labour.create({
        data: {
          user: { connect: { id: user.id } },
          contractor: { connect: { id: contractorId } },
          employeeNo,
          aadhar_number,
          fingerprint_data,
          createdBy: { connect: { id: admin.id } },
          updatedBy: { connect: { id: admin.id } },
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

      console.log(`Labour ${userDetails.name} created successfully with employeeNo: ${employeeNo}.`);
    }

    console.log('All labours created successfully.');
  } catch (error) {
    console.error('Error creating labours:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create labours: ' + error.message);
  }
};

const generateIndianPhoneNumber = () => {
  return `+91${faker.random.number({ min: 7000000000, max: 9999999999 })}`;
};

const generateIndianAadharNumber = () => {
  return `${faker.random.number({ min: 1000, max: 9999 })}${faker.random.number({
    min: 1000,
    max: 9999,
  })}${faker.random.number({ min: 1000, max: 9999 })}`;
};

const generateIndianName = () => {
  const firstNames = ['Aarav', 'Vihaan', 'Arjun', 'Sai', 'Ishaan', 'Reyansh', 'Aryan', 'Aditya', 'Advait', 'Dhruv'];
  const lastNames = ['Patel', 'Sharma', 'Singh', 'Kumar', 'Gupta', 'Verma', 'Jain', 'Mehta', 'Shah', 'Reddy'];
  return `${faker.random.arrayElement(firstNames)} ${faker.random.arrayElement(lastNames)}`;
};

const generateUsername = (name) => {
  const usernameBase = name.toLowerCase().replace(/\s+/g, '_');
  const randomSuffix = faker.random.number({ min: 100, max: 999 });
  return `${usernameBase}_${randomSuffix}`;
};

const createContractorWithLabours = async (contractorData) => {
  const contractor = await createContractor(contractorData);

  const laboursData = Array.from({ length: 5 }, () => {
    const name = generateIndianName();
    return {
      name,
      username: generateUsername(name),
      password: 'password123',
      mobile_number: generateIndianPhoneNumber(),
      aadhar_number: generateIndianAadharNumber(),
      fingerprint_data: faker.random.alphaNumeric(10),
      photos: [],
      pdfs: [],
    };
  });

  await createLabours(contractor.id, laboursData);
};

const seedAll = async () => {
  try {
    const contractorsData = Array.from({ length: 4 }, () => {
      const name = generateIndianName();
      return {
        name,
        username: generateUsername(name),
        password: 'password123',
        mobile_number: generateIndianPhoneNumber(),
        firm_name: `${generateIndianName()} Constructions`,
        aadhar_number: generateIndianAadharNumber(),
        photos: [],
        pdfs: [],
      };
    });

    for (const contractorData of contractorsData) {
      await createContractorWithLabours(contractorData);
    }

    const startDate = '2025-01-01';
    const endDate = '2025-01-22';
    const labours = await db.labour.findMany();

    for (const labour of labours) {
      await generateAttendanceRecords(labour.id, startDate, endDate);
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await db.$disconnect();
  }
};

seedAll();

module.exports = {
  seedAll,
};
