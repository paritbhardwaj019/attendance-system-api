const { PrismaClient } = require('@prisma/client');
const prompt = require('prompt');
const { hashPassword } = require('../utils/utils');
const logger = require('../config/logger');
const { ROLES } = require('../config/roles');
const db = require('../database/prisma');

const prisma = new PrismaClient();

const ADMIN_ERRORS = {
  ROLE_NOT_FOUND: 'Admin role does not exist. Please run seedRoles.js first.',
  ADMIN_EXISTS: 'An admin user already exists:',
  USERNAME_EXISTS: 'Username already exists',
  MOBILE_INVALID: 'Mobile number must be a valid number',
  SYSTEM_CODE_NOT_FOUND: 'System code for ADMIN not found. Please run initializeDefaultCodes.js first.',
};

const schema = {
  properties: {
    name: {
      description: 'Enter admin name',
      type: 'string',
      required: true,
      message: 'Name is required',
      conform: function (value) {
        return value.length >= 2 && value.length <= 50;
      },
    },
    username: {
      description: 'Enter admin username',
      type: 'string',
      pattern: /^[a-zA-Z0-9_]{3,20}$/,
      message: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores',
      required: true,
    },
    password: {
      description: 'Enter admin password',
      type: 'string',
      hidden: true,
      replace: '*',
      conform: function (value) {
        return value.length >= 6 && value.length <= 30;
      },
      message: 'Password must be between 6 and 30 characters',
      required: true,
    },
    mobile_number: {
      description: 'Enter mobile number (optional)',
      type: 'string',
      pattern: /^[0-9]{10}$/,
      message: 'Mobile number must be 10 digits',
      required: false,
    },
  },
};

const validateAdminRole = async () => {
  const adminRole = await prisma.role.findUnique({
    where: { name: ROLES.ADMIN },
  });

  if (!adminRole) {
    throw new Error(ADMIN_ERRORS.ROLE_NOT_FOUND);
  }

  return adminRole;
};

const checkExistingAdmin = async (adminRole) => {
  const existingAdmin = await prisma.user.findFirst({
    where: {
      roleId: adminRole.id,
    },
    include: {
      role: true,
    },
  });

  if (existingAdmin) {
    await db.user.delete({
      where: { id: existingAdmin.id },
    });
    throw new Error(`${ADMIN_ERRORS.ADMIN_EXISTS} ${existingAdmin.username}`);
  }
};

const checkExistingUsername = async (username) => {
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new Error(ADMIN_ERRORS.USERNAME_EXISTS);
  }
};

const createAdminUser = async (adminData, roleId) => {
  const { name, username, password, mobile_number } = adminData;
  const hashedPassword = await hashPassword(password);

  const adminCount = await prisma.admin.count();
  const employeeNo = `ADM${String(adminCount + 1).padStart(6, '0')}`;

  return prisma.user.create({
    data: {
      name,
      username,
      password: hashedPassword,
      mobile_number,
      roleId,
      admin: {
        create: {
          employeeNo,
        },
      },
    },
    include: {
      role: true,
      admin: true,
    },
  });
};

async function seedAdmin() {
  prompt.start();

  try {
    const adminRole = await validateAdminRole();

    await checkExistingAdmin(adminRole);

    const userData = await new Promise((resolve, reject) => {
      prompt.get(schema, function (err, result) {
        if (err) reject(err);
        else resolve(result);
      });
    });

    await checkExistingUsername(userData.username);

    const adminUser = await createAdminUser(userData, adminRole.id);

    logger.info(`Admin user '${adminUser.username}' created successfully with employeeNo: ${adminUser.admin.employeeNo} ❤️`);
  } catch (error) {
    logger.error('Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedAdmin().catch((error) => {
    logger.error(error);
    process.exit(1);
  });
}

module.exports = seedAdmin;
