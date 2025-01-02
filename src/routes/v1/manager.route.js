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
  .route('/contractors/:contractorId')
  .put(
    checkJWT,
    checkRole([ROLES.ADMIN, ROLES.MANAGER]),
    upload.fields([
      { name: 'photos', maxCount: 10 },
      { name: 'pdfs', maxCount: 5 },
    ]),
    managerController.editContractor
  )
  .delete(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), managerController.deleteContractor);

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

managerRouter
  .route('/labour/:labourId')
  .put(
    checkJWT,
    checkRole([ROLES.ADMIN, ROLES.MANAGER]),
    upload.fields([
      { name: 'photos', maxCount: 10 },
      { name: 'pdfs', maxCount: 2 },
    ]),
    managerController.editLabour
  )
  .delete(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), managerController.deleteLabour);

module.exports = managerRouter;
