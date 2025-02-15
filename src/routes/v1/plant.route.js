const express = require('express');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const plantController = require('../../controllers/plant.controller');
const { ROLES } = require('../../config/roles');

const plantRouter = express.Router();

plantRouter
  .route('/')
  .post(checkJWT, checkRole([ROLES.ADMIN]), plantController.createPlant)
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), plantController.getPlants);

plantRouter
  .route('/:id')
  .put(checkJWT, checkRole([ROLES.ADMIN]), plantController.updatePlant)
  .delete(checkJWT, checkRole([ROLES.ADMIN]), plantController.deletePlant);

plantRouter.route('/:id/members').post(checkJWT, checkRole([ROLES.ADMIN]), plantController.addPlantMember);

plantRouter.route('/:id/members/:userId').delete(checkJWT, checkRole([ROLES.ADMIN]), plantController.removePlantMember);

plantRouter
  .route('/:id/visitors')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER]), plantController.getPlantVisitorRequests);

plantRouter
  .route('/:id/access')
  .get(
    checkJWT,
    checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR, ROLES.LABOUR, ROLES.VISITOR]),
    plantController.checkPlantAccess
  );

module.exports = plantRouter;
