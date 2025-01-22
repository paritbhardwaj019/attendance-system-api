const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { ROLES } = require('../config/roles');
const { hashPassword } = require('../utils/utils');
const { uploadFileToS3 } = require('../services/s3.service');

const prisma = new PrismaClient();

async function seedLabour() {
  try {
    // Define labour data for Vis A, Vis B, and Vis C
    const labours = [
      {
        name: 'Vis A',
        username: 'vis_a',
        password: 'password123',
        mobile_number: '1111111111',
        aadhar_number: '111111111111',
        fingerprint_data: 'fingerprint_data_placeholder',
        photoPath: path.join(__dirname, '../temp/vis-a.jpeg'),
        employeeNo: 'LAB21', // Employee number for Vis A
      },
      {
        name: 'Vis B',
        username: 'vis_b',
        password: 'password123',
        mobile_number: '2222222222',
        aadhar_number: '222222222222',
        fingerprint_data: 'fingerprint_data_placeholder',
        photoPath: path.join(__dirname, '../temp/vis-b.jpeg'),
        employeeNo: 'LAB22', // Employee number for Vis B
      },
      {
        name: 'Vis C',
        username: 'vis_c',
        password: 'password123',
        mobile_number: '3333333333',
        aadhar_number: '333333333333',
        fingerprint_data: 'fingerprint_data_placeholder',
        photoPath: path.join(__dirname, '../temp/vis-c.jpeg'),
        employeeNo: 'LAB23', // Employee number for Vis C
      },
    ];

    for (const labourData of labours) {
      // Check if the username already exists
      const existingUser = await prisma.user.findUnique({
        where: {
          username: labourData.username,
        },
      });

      if (existingUser) {
        console.error(`Username ${labourData.username} already exists`);
        continue; // Skip to the next labour
      }

      // Check if the Aadhar number already exists
      const existingLabour = await prisma.labour.findUnique({
        where: {
          aadhar_number: labourData.aadhar_number,
        },
      });

      if (existingLabour) {
        console.error(`Aadhar number ${labourData.aadhar_number} already registered`);
        continue; // Skip to the next labour
      }

      // Read the photo file
      const photoData = fs.readFileSync(labourData.photoPath);

      // Prepare the file object for S3 upload
      const tempFile = {
        path: labourData.photoPath,
        originalname: path.basename(labourData.photoPath),
        mimetype: 'image/jpeg',
      };

      // Upload the photo to S3
      const photoUrl = await uploadFileToS3(tempFile, 'labour-photos');

      if (!photoUrl) {
        console.error('Failed to upload photo to S3');
        continue; // Skip to the next labour
      }

      // Create the labour record in a transaction
      const createdLabour = await prisma.$transaction(async (tx) => {
        // Create the user record
        const user = await tx.user.create({
          data: {
            name: labourData.name,
            username: labourData.username,
            password: await hashPassword(labourData.password),
            mobile_number: labourData.mobile_number,
            role: { connect: { name: ROLES.LABOUR } },
          },
        });

        // Create the labour record
        const labourRecord = await tx.labour.create({
          data: {
            user: { connect: { id: user.id } },
            employeeNo: labourData.employeeNo, // Use the predefined employee number
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

      console.log(`Labour record created successfully for ${labourData.name}:`, createdLabour);
    }
  } catch (error) {
    console.error('Error seeding labour:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedLabour();
