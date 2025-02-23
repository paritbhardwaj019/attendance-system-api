const { ROLES } = require('../config/roles');
const db = require('../database/prisma');

const initializeDefaultCodes = async () => {
  const defaultCodes = [
    { moduleType: 'ADMIN', prefix: 'ADM', lastNumber: 1 },
    { moduleType: 'MANAGER', prefix: 'MGR', lastNumber: 0 },
    { moduleType: 'LABOUR', prefix: 'LAB', lastNumber: 0 },
    { moduleType: 'CONTRACTOR', prefix: 'CON', lastNumber: 0 },
    { moduleType: 'VISITOR', prefix: 'VIS', lastNumber: 0 },
    { moduleType: 'PERSON', prefix: 'PER', lastNumber: 0 },
    { moduleType: 'PLANT', prefix: 'PLT', lastNumber: 0 },
    { moduleType: 'EMPLOYEE', prefix: 'EMP', lastNumber: 0 },
  ];

  const admin = await db.user.findFirst({
    where: {
      role: {
        name: ROLES.ADMIN,
      },
    },
  });

  if (!admin) {
    throw new Error('Admin not found!');
  }

  await db.systemCode.deleteMany();

  for (const code of defaultCodes) {
    const existing = await db.systemCode.findUnique({
      where: { moduleType: code.moduleType },
    });

    if (!existing) {
      await db.systemCode.create({
        data: {
          ...code,
          createdBy: { connect: { id: admin.id } },
          updatedBy: { connect: { id: admin.id } },
        },
      });
    }
  }
};

initializeDefaultCodes();
