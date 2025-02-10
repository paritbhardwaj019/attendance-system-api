const express = require('express');
const reportController = require('../../controllers/report.controller');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const { ROLES } = require('../../config/roles');

const reportRouter = express.Router();

// Place specific routes before parametric routes
reportRouter
  .route('/dailyReport')
  .get(
    checkJWT, 
    checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), 
    reportController.getDailyReport
  );

reportRouter
  .route('/contractor')
  .get(
    checkJWT, 
    checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), 
    reportController.getContractorLabourReport
  );

// Generic and parametric routes at the end
reportRouter
  .route('/:id')
  .get(
    checkJWT, 
    checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), 
    reportController.getLabourReportById
  );

reportRouter
  .route('/')
  .get(
    checkJWT, 
    checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), 
    reportController.getLabourReport
  );

reportRouter
  .route('/customReport')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), reportController.getCustomReport);

reportRouter
  .route('/contractor/dailyReport')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), reportController.getContractorDailyReport);

reportRouter
  .route('/contractor/customReport')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), reportController.getContractorCustomReport);


module.exports = reportRouter;
