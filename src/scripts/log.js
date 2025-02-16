const db = require('../database/prisma');

(async () => {
  const codes = await db.systemCode.findMany();
  console.log(codes);
})();
