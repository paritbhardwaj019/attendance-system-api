const express = require('express');
const userController = require('../../controllers/user.controller');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');

const userRouter = express.Router();

userRouter
  .route('/')
  .post(checkJWT, checkRole(['Admin']), userController.createUser)
  .get(checkJWT, checkRole(['Admin']), userController.listUsers);
userRouter
  .route('/:id')
  .delete(checkJWT, checkRole(['Admin']), userController.deleteUser)
  .get(checkJWT, checkRole(['Admin']), userController.fetchUserDetails);

module.exports = userRouter;
