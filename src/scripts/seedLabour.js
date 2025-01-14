const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { ROLES } = require('../config/roles');
const { hashPassword } = require('../utils/utils');
const { uploadFileToS3 } = require('../services/s3.service');

const prisma = new PrismaClient();

async function seedLabour() {
  try {
    const labourData = {
      name: 'Ashish Kumar',
      username: 'ashish_kumar',
      password: 'password123',
      mobile_number: '1234567890',
      aadhar_number: '123412341234',
      fingerprint_data: 'fingerprint_data_placeholder',
    };

    const existingUser = await prisma.user.findUnique({
      where: {
        username: labourData.username,
      },
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    const existingLabour = await prisma.labour.findUnique({
      where: {
        aadhar_number: labourData.aadhar_number,
      },
    });

    if (existingLabour) {
      throw new Error('Aadhar number already registered');
    }

    const photoPath = path.join(__dirname, '../temp/uploads/demo-data.jpg');
    const photoData = fs.readFileSync(photoPath);

    const tempFile = {
      path: photoPath,
      originalname: 'demo-data.jpg',
      mimetype: 'image/jpeg',
    };

    const photoUrl = await uploadFileToS3(tempFile, 'labour-photos');

    if (!photoUrl) {
      throw new Error('Failed to upload photo to S3');
    }

    const createdLabour = await prisma.$transaction(async (tx) => {
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
          employeeNo: '1002', // Fixed employee number
          fingerprint_data: labourData.fingerprint_data,
          aadhar_number: labourData.aadhar_number,
          createdBy: { connect: { id: 1 } }, // Assuming loggedInUser ID is 1 for seeding
          updatedBy: { connect: { id: 1 } }, // Assuming loggedInUser ID is 1 for seeding
          photos: {
            create: {
              url: photoUrl,
            },
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
          photos: true,
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
    });

    console.log('Labour record created successfully:', createdLabour);
  } catch (error) {
    console.error('Error seeding labour:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedLabour();
