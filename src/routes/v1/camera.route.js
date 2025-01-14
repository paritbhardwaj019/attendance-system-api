const express = require('express');
const cameraController = require('../../controllers/camera.controller');
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

module.exports = cameraRouter;
