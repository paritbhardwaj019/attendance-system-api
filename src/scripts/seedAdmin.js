const { PrismaClient } = require('@prisma/client');
const prompt = require('prompt');
const { hashPassword } = require('../utils/utils');
const logger = require('../config/logger');

const prisma = new PrismaClient();

async function seedAdmin() {
  prompt.start();

  const schema = {
    properties: {
      name: {
        description: 'Enter admin name',
        type: 'string',
        required: true,
        message: 'Name is required',
      },
      username: {
        description: 'Enter admin username',
        type: 'string',
        pattern: /^[a-zA-Z0-9_]+$/,
        message: 'Username must be alphanumeric with underscores',
        required: true,
      },
      password: {
        description: 'Enter admin password',
        type: 'string',
        hidden: true,
        replace: '*',
        conform: function (value) {
          return value.length >= 6;
        },
        message: 'Password must be at least 6 characters',
        required: true,
      },
    },
  };

  const { name, username, password } = await new Promise((resolve, reject) => {
    prompt.get(schema, function (err, result) {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const hashedPassword = await hashPassword(password);

  const adminRole = await prisma.role.findUnique({
    where: { name: 'Admin' },
  });

  if (!adminRole) {
    logger.error('Admin role does not exist. Please run seedRoles.js first.');
    return;
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      roleId: adminRole.id,
    },
  });

  if (existingAdmin) {
    logger.error('An admin user already exists:', existingAdmin.username);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      username,
      password: hashedPassword,
      roleId: adminRole.id,
      admin: {
        create: {},
      },
    },
    include: {
      role: true,
      admin: true,
    },
  });

  logger.info('Admin user created successfully <3');
}

seedAdmin()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
