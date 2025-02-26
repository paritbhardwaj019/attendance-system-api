const express = require('express');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const attendanceController = require('../../controllers/attendance.controller');
const { ROLES } = require('../../config/roles');
const { attendance } = require('../../database/prisma');

const attendanceRouter = express.Router();

// attendanceRouter.get(
//   '/report',
//   checkJWT,
//   checkRole([ROLES.ADMIN, ROLES.CONTRACTOR, ROLES.MANAGER]),
//   attendanceController.getAttendanceReport
// );

attendanceRouter.route('/records').get(checkJWT, checkRole([ROLES.LABOUR]), attendanceController.getLabourAttendance);
// attendanceRouter.route('/').post(checkJWT, checkRole([ROLES.LABOUR]), attendanceController.recordAttendance);
// attendanceRouter
//   .route('/:id')
//   .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.CONTRACTOR, ROLES.MANAGER]), attendanceController.getAttendance);

attendanceRouter
  .route('/fetch-and-store')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.CONTRACTOR, ROLES.MANAGER]), attendanceController.fetchAndStoreAttendance);

module.exports = attendanceRouter;
