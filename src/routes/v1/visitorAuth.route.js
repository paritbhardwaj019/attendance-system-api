const express = require('express');
const visitorAuthController = require('../../controllers/visitorAuth.controller');

const visitorAuthRouter = express.Router();

visitorAuthRouter.route('/signup').post(visitorAuthController.visitorSignup);

visitorAuthRouter.route('/login').post(visitorAuthController.visitorLogin);

module.exports = visitorAuthRouter;
