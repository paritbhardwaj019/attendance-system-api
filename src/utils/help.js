const db = require('../database/prisma');

(async () => {
  console.log(await db.role.findMany());
  console.log(await db.user.findMany());
})();
