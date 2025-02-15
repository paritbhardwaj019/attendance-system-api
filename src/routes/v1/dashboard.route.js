const express = require('express');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const dashboardController = require('../../controllers/dashboard.controller');
const { ROLES } = require('../../config/roles');

const dashboardRouter = express.Router();

dashboardRouter
  .route('/summary')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), dashboardController.getDashboardSummary);

module.exports = dashboardRouter;
