const express = require('express');
const checkJWT = require('../../middlewares/checkJWT');
const checkRole = require('../../middlewares/checkRole');
const mealController = require('../../controllers/meal.controller');
const { ROLES } = require('../../config/roles');

const mealRouter = express.Router();

mealRouter
  .route('/')
  .post(checkJWT, checkRole([ROLES.ADMIN, ROLES.EMPLOYEE]), mealController.createMeal)
  .get(checkJWT, mealController.getMeals);

mealRouter.route('/:mealId').delete(checkJWT, checkRole([ROLES.ADMIN, ROLES.EMPLOYEE]), mealController.deleteMeal);

mealRouter.route('/request').post(checkJWT, mealController.requestMeal).get(checkJWT, mealController.listMealRequests);

mealRouter.route('/request/:ticketId').get(checkJWT, mealController.getMealRequestStatus);

mealRouter
  .route('/request/:ticketId/process')
  .put(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]), mealController.processMealRequest);

mealRouter
  .route('/request/:ticketId/entry')
  .post(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]), mealController.handleMealEntry);

mealRouter
  .route('/records')
  .get(checkJWT, checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]), mealController.getMealRecords);

mealRouter.route('/dashboard').get(checkJWT, mealController.getMealDashboard);

module.exports = mealRouter;
