const express = require('express');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const attendanceController = require('../../controllers/attendance.controller');

const attendanceRouter = express.Router();

attendanceRouter.route('/records').get(checkJWT, checkRole(['Staff']), attendanceController.getStaffAttendance);
attendanceRouter.route('/').post(checkJWT, checkRole(['Staff']), attendanceController.recordAttendance);
attendanceRouter.route('/:id').get(checkJWT, checkRole(['Manager', 'Contractor']), attendanceController.getAttendance);

module.exports = attendanceRouter;
