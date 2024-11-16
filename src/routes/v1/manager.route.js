const express = require('express');
const managerController = require('../../controllers/manager.controller');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');

const managerRouter = express.Router();

managerRouter.route('/contractors/:id/staff').get(checkJWT, checkRole(['Manager']), managerController.getContractorStaff);

managerRouter
  .route('/contractors')
  .post(checkJWT, checkRole(['Manager']), managerController.addContractor)
  .get(checkJWT, checkRole(['Manager']), managerController.getContractors);

managerRouter.route('/staff').post(checkJWT, checkRole(['Manager']), managerController.addStaff);

module.exports = managerRouter;
