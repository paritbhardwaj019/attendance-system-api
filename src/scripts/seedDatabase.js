const { PrismaClient } = require('@prisma/client');
const { ROLES } = require('../config/roles');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

const prisma = new PrismaClient();

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function seedDatabase() {
  try {
    await prisma.$transaction([
      prisma.attendance.deleteMany({}),
      prisma.labourPDF.deleteMany({}),
      prisma.labourPhoto.deleteMany({}),
      prisma.labour.deleteMany({}),
      prisma.contractorPDF.deleteMany({}),
      prisma.contractorPhoto.deleteMany({}),
      prisma.contractor.deleteMany({}),
      prisma.visitor.deleteMany({}),
      prisma.manager.deleteMany({}),
      prisma.admin.deleteMany({}),
      prisma.user.deleteMany({}),
      prisma.role.deleteMany({}),
    ]);

    const roles = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR, ROLES.LABOUR];
    const roleMap = {};

    for (const roleName of roles) {
      const role = await prisma.role.create({
        data: { name: roleName },
      });
      roleMap[roleName] = role.id;
      logger.info(`Role '${role.name}' has been seeded.`);
    }

    const adminUsers = [];
    for (let i = 1; i <= 1; i++) {
      const userData = {
        name: `Admin ${i}`,
        username: `admin${i}`,
        password: await hashPassword('password123'),
        mobile_number: `98765${i.toString().padStart(5, '0')}`,
        roleId: roleMap[ROLES.ADMIN],
      };

      const user = await prisma.user.create({
        data: {
          ...userData,
          admin: {
            create: {},
          },
        },
      });
      adminUsers.push(user);
      logger.info(`Admin user '${user.username}' created`);
    }

    const managerUsers = [];
    for (let i = 1; i <= 10; i++) {
      const userData = {
        name: `Manager ${i}`,
        username: `manager${i}`,
        password: await hashPassword('password123'),
        mobile_number: `98764${i.toString().padStart(5, '0')}`,
        roleId: roleMap[ROLES.MANAGER],
      };

      const user = await prisma.user.create({
        data: {
          ...userData,
          manager: {
            create: {},
          },
        },
        include: {
          manager: true,
        },
      });
      managerUsers.push(user);
      logger.info(`Manager user '${user.username}' created`);
    }

    const contractorUsers = [];
    for (let i = 1; i <= 10; i++) {
      const createdBy = i % 2 === 0 ? adminUsers[0] : managerUsers[0];
      const assignedManager = i % 2 === 0 ? null : managerUsers[0];

      const userData = {
        name: `Contractor ${i}`,
        username: `contractor${i}`,
        password: await hashPassword('password123'),
        mobile_number: `98763${i.toString().padStart(5, '0')}`,
        roleId: roleMap[ROLES.CONTRACTOR],
        contractor: {
          create: {
            firm_name: `Firm ${i}`,
            aadhar_number: `1234${i.toString().padStart(8, '0')}`,
            managerId: assignedManager?.manager?.id,
            createdById: createdBy.id,
            updatedById: createdBy.id,
          },
        },
      };

      const user = await prisma.user.create({
        data: userData,
        include: {
          contractor: true,
        },
      });
      contractorUsers.push(user);
      logger.info(`Contractor user '${user.username}' created`);
    }

    for (let i = 1; i <= 10; i++) {
      const createdBy = i % 2 === 0 ? adminUsers[0] : managerUsers[0];

      const userData = {
        name: `Labour ${i}`,
        username: `labour${i}`,
        password: await hashPassword('password123'),
        mobile_number: `98762${i.toString().padStart(5, '0')}`,
        roleId: roleMap[ROLES.LABOUR],
        labour: {
          create: {
            fingerprint_data: `fingerprint_data_${i}`,
            aadhar_number: `5678${i.toString().padStart(8, '0')}`,
            contractorId: contractorUsers[i % 10].contractor.id,
            createdById: createdBy.id,
            updatedById: createdBy.id,
            attendance: {
              create: {
                createdAt: new Date(),
              },
            },
          },
        },
      };

      const user = await prisma.user.create({
        data: userData,
      });
      logger.info(`Labour user '${user.username}' created`);
    }

    for (let i = 1; i <= 10; i++) {
      const visitor = await prisma.visitor.create({
        data: {
          name: `Visitor ${i}`,
          contact: `98761${i.toString().padStart(5, '0')}`,
          email: `visitor${i}@example.com`,
          visitPurpose: `Purpose ${i}`,
          visitDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          status: i % 3 === 0 ? 'APPROVED' : i % 3 === 1 ? 'PENDING' : 'REJECTED',
          ticketId: `TICKET${i.toString().padStart(5, '0')}`,
          remarks: `Remarks for visitor ${i}`,
          createdById: adminUsers[0].id,
          approvedById: i % 3 === 0 ? managerUsers[0].id : null,
        },
      });
      logger.info(`Visitor '${visitor.name}' created`);
    }

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

seedDatabase()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
