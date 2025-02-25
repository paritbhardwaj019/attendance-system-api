const express = require('express');
const userController = require('../../controllers/user.controller');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const { ROLES } = require('../../config/roles');
const upload = require('../../middlewares/uploadMiddlware');

const userRouter = express.Router();

userRouter.route('/with-passwords').get(checkJWT, checkRole([ROLES.ADMIN]), userController.getUsersWithPasswords);

userRouter
  .route('/')
  .post(upload.fields([{ name: 'photos', maxCount: 1 }]), checkJWT, checkRole([ROLES.ADMIN]), userController.createUser)
  .get(checkJWT, checkRole([ROLES.ADMIN]), userController.getUsers);
userRouter
  .route('/:id')
  .get(checkJWT, checkRole([ROLES.ADMIN]), userController.getUser)
  .delete(checkJWT, checkRole([ROLES.ADMIN]), userController.deleteUser);

module.exports = userRouter;
