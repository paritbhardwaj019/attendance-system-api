const express = require('express');
const userController = require('../../controllers/user.controller');

const userRouter = express.Router();

userRouter.route('/').post(userController.createUser).get(userController.getUsers);
userRouter.route('/:id').get(userController.getUser).delete(userController.deleteUser);

module.exports = userRouter;
