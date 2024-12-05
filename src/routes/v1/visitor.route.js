const express = require('express');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const visitorController = require('../../controllers/visitor.controller');
const { ROLES } = require('../../config/roles');

const visitorRouter = express.Router();

visitorRouter.route('/register').post(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), visitorController.registerVisitor);

visitorRouter.route('/status/:identifier').get(visitorController.getVisitorStatus);

visitorRouter
  .route('/:ticketId/process')
  .put(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), visitorController.processVisitorRequest);

visitorRouter.route('/').get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), visitorController.listVisitorRequests);

module.exports = visitorRouter;
