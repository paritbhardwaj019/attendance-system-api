const express = require('express');
const reportController = require('../../controllers/report.controller');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const { ROLES } = require('../../config/roles');

const reportRouter = express.Router();

reportRouter
  .route('/contractor')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), reportController.getContractorLabourReport);

reportRouter
  .route('/')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), reportController.getLabourReport);

reportRouter
  .route('/:id')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), reportController.getLabourReportById);

module.exports = reportRouter;
