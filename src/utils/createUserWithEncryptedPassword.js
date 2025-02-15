const { encrypt } = require('./encryption');
const { hashPassword } = require('./utils');

const createUserWithEncryptedPassword = async (userData) => {
  const hashedPassword = await hashPassword(userData.password);
  const encryptedPlainPassword = encrypt(userData.password);

  return db.user.create({
    data: {
      ...userData,
      password: hashedPassword,
      encryptedPlainPassword: encryptedPlainPassword,
    },
  });
};

module.exports = { createUserWithEncryptedPassword };
