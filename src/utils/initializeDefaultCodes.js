const { ROLES } = require('../config/roles');
const db = require('../database/prisma');

const initializeDefaultCodes = async () => {
  const defaultCodes = [
    { moduleType: 'LABOUR', prefix: 'LAB' },
    { moduleType: 'CONTRACTOR', prefix: 'CON' },
    { moduleType: 'VISITOR', prefix: 'VIS' },
    { moduleType: 'PERSON', prefix: 'PER' },
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

  for (const code of defaultCodes) {
    const existing = await db.systemCode.findUnique({
      where: { moduleType: code.moduleType },
    });

    if (!existing) {
      await db.systemCode.create({
        data: {
          ...code,
          lastNumber: 0,
          createdBy: { connect: { id: admin.id } },
          updatedBy: { connect: { id: admin.id } },
        },
      });
    }
  }
};

initializeDefaultCodes();
