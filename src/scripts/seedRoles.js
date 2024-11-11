const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

async function seedRoles() {
  const roles = ['Admin', 'Manager', 'Contractor', 'Staff'];

  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    logger.info(`Role '${role.name}' has been seeded.`);
  }
}

seedRoles()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
