const express = require('express');
const authController = require('../../controllers/auth.controller');

const authRouter = express.Router();

authRouter.post('/login', authController.loginWithUserNameHandler);

module.exports = authRouter;
