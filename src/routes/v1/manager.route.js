const express = require('express');
const managerController = require('../../controllers/manager.controller');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const { ROLES } = require('../../config/roles');
const upload = require('../../middlewares/uploadMiddlware');

const managerRouter = express.Router();

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
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), managerController.getContractors);

managerRouter
  .route('/labour')
  .post(
    checkJWT,
    checkRole([ROLES.ADMIN, ROLES.MANAGER]),
    upload.fields([
      { name: 'photos', maxCount: 10 },
      { name: 'pdfs', maxCount: 2 },
    ]),
    managerController.addLabour
  )
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR]), managerController.getLabour);

module.exports = managerRouter;
