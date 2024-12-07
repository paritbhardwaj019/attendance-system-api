const express = require('express');
const managerController = require('../../controllers/manager.controller');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const { ROLES } = require('../../config/roles');
const upload = require('../../middlewares/uploadMiddlware');

const managerRouter = express.Router();

managerRouter
  .route('/contractors/:id/staff')
  .get(checkJWT, checkRole([ROLES.MANAGER, ROLES.ADMIN]), managerController.getContractorLabour);

managerRouter
  .route('/contractors')
  .post(
    checkJWT,
    checkRole([ROLES.ADMIN, ROLES.MANAGER]),
    upload.fields([
      { name: 'photos', maxCount: 10 },
      { name: 'pdfs', maxCount: 5 },
    ]),
    managerController.addContractor
  )
  .get(checkJWT, checkRole([ROLES.MANAGER, ROLES.ADMIN]), managerController.getContractors);

managerRouter.route('/staff').post(
  checkJWT,
  checkRole([ROLES.MANAGER, ROLES.CONTRACTOR]),
  upload.fields([
    { name: 'photos', maxCount: 10 },
    { name: 'pdfs', maxCount: 5 },
  ]),
  managerController.addLabour
);

module.exports = managerRouter;
