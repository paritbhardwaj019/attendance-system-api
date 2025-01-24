const express = require('express');
const cameraController = require('../../controllers/camera.controller');
const attendanceController = require('../../controllers/attendance.controller');
const reportController = require('../../controllers/report.controller');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const { ROLES } = require('../../config/roles');

const cameraRouter = express.Router();

cameraRouter
  .route('/search')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), cameraController.searchUser);

cameraRouter
  .route('/attendance')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), cameraController.getAttendance);

cameraRouter
  .route('/daily')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), cameraController.getDailyAttendance);

cameraRouter
  .route('/fill-data')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), cameraController.fillDataInDb);

cameraRouter
  .route('/test')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), cameraController.test);

cameraRouter
  .route('/fetch')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), attendanceController.fetchAndStoreAttendance);

cameraRouter.route('/dailyReport')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), reportController.getDailyReport);

cameraRouter.route('/customReport')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), reportController.getCustomReport);


module.exports = cameraRouter;
