const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  try {
    const backupFilePath = path.join(__dirname, '../backups/attendance_backup_2025-02-16T06-23-48.901Z.json');
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

    await prisma.attendance.deleteMany({});
    await prisma.labourPhoto.deleteMany({});
    await prisma.labourPDF.deleteMany({});
    await prisma.contractorPhoto.deleteMany({});
    await prisma.contractorPDF.deleteMany({});
    await prisma.visitorPhoto.deleteMany({});
    await prisma.visitorEntry.deleteMany({});
    await prisma.plantMember.deleteMany({});
    await prisma.visitor.deleteMany({});
    await prisma.labour.deleteMany({});
    await prisma.contractor.deleteMany({});
    await prisma.admin.deleteMany({});
    await prisma.manager.deleteMany({});
    await prisma.visitorSignup.deleteMany({});
    await prisma.plant.deleteMany({});
    await prisma.systemCode.deleteMany({});
    await prisma.user.deleteMany({});

    const roles = new Map();
    for (const labour of backupData.labours) {
      const userRole = labour.user.role;
      if (!roles.has(userRole.name)) {
        const role = await prisma.role.upsert({
          where: { name: userRole.name },
          update: {},
          create: {
            name: userRole.name,
            createdAt: new Date(userRole.createdAt),
            updatedAt: new Date(userRole.updatedAt),
          },
        });
        roles.set(userRole.name, role);
      }

      const contractorRole = labour.contractor.user.role;
      if (!roles.has(contractorRole.name)) {
        const role = await prisma.role.upsert({
          where: { name: contractorRole.name },
          update: {},
          create: {
            name: contractorRole.name,
            createdAt: new Date(contractorRole.createdAt),
            updatedAt: new Date(contractorRole.updatedAt),
          },
        });
        roles.set(contractorRole.name, role);
      }
    }

    const contractorData = backupData.labours[0].contractor;
    const contractorUser = await prisma.user.create({
      data: {
        name: contractorData.user.name,
        username: contractorData.user.username,
        password: contractorData.user.password,
        encryptedPlainPassword: '-',
        mobile_number: contractorData.user.mobile_number,
        roleId: roles.get(contractorData.user.role.name).id,
        createdAt: new Date(contractorData.user.createdAt),
        updatedAt: new Date(contractorData.user.updatedAt),
      },
    });

    const contractor = await prisma.contractor.create({
      data: {
        user: { connect: { id: contractorUser.id } },
        firm_name: contractorData.firm_name,
        employeeNo: contractorData.employeeNo,
        aadhar_number: contractorData.aadhar_number,
        startDate: contractorData.startDate ? new Date(contractorData.startDate) : null,
        endDate: contractorData.endDate ? new Date(contractorData.endDate) : null,
        siteCode: contractorData.siteCode,
        createdBy: { connect: { id: contractorUser.id } },
        updatedBy: { connect: { id: contractorUser.id } },
        createdAt: new Date(contractorData.createdAt),
        updatedAt: new Date(contractorData.updatedAt),
      },
    });

    for (const labourData of backupData.labours) {
      const labourUser = await prisma.user.create({
        data: {
          name: labourData.user.name,
          username: labourData.user.username,
          password: labourData.user.password,
          encryptedPlainPassword: '-',
          mobile_number: labourData.user.mobile_number,
          roleId: roles.get(labourData.user.role.name).id,
          createdAt: new Date(labourData.user.createdAt),
          updatedAt: new Date(labourData.user.updatedAt),
        },
      });

      const labour = await prisma.labour.create({
        data: {
          user: { connect: { id: labourUser.id } },
          contractor: { connect: { id: contractor.id } },
          fingerprint_data: labourData.fingerprint_data,
          aadhar_number: labourData.aadhar_number,
          employeeNo: labourData.employeeNo,
          createdBy: { connect: { id: contractorUser.id } },
          updatedBy: { connect: { id: contractorUser.id } },
          createdAt: new Date(labourData.createdAt),
          updatedAt: new Date(labourData.updatedAt),
        },
      });

      if (labourData.photos && labourData.photos.length > 0) {
        await prisma.labourPhoto.createMany({
          data: labourData.photos.map((photo) => ({
            url: photo.url,
            labourId: labour.id,
            createdAt: new Date(photo.createdAt),
            updatedAt: new Date(photo.updatedAt),
          })),
        });
      }

      if (labourData.attendance && labourData.attendance.length > 0) {
        await prisma.attendance.createMany({
          data: labourData.attendance.map((att) => ({
            labourId: labour.id,
            inTime: att.inTime ? new Date(att.inTime) : null,
            outTime: att.outTime ? new Date(att.outTime) : null,
            workingHours: att.workingHours,
            date: new Date(att.date),
            createdAt: new Date(att.createdAt),
            updatedAt: new Date(att.updatedAt),
          })),
        });
      }
    }

    console.log('Restore completed successfully');
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
