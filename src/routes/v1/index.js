const express = require('express');
const authRouter = require('./auth.route');
const userRouter = require('./user.route');
const managerRouter = require('./manager.route');
const attendanceRouter = require('./attendance.route');
const visitorRouter = require('./visitor.route');
const cameraRouter = require('./camera.route');
const reportRouter = require('./report.route');
const visitorAuthRouter = require('./visitorAuth.route');
const plantRouter = require('./plant.route');
const dashboardRouter = require('./dashboard.route');
const mealRouter = require('./meal.route');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRouter,
  },
  {
    path: '/users',
    route: userRouter,
  },
  {
    path: '/manager',
    route: managerRouter,
  },
  {
    path: '/attendance',
    route: attendanceRouter,
  },
  {
    path: '/visitor',
    route: visitorRouter,
  },
  {
    path: '/camera',
    route: cameraRouter,
  },
  {
    path: '/reports',
    route: reportRouter,
  },
  {
    path: '/visitor-auth',
    route: visitorAuthRouter,
  },
  {
    path: '/plants',
    route: plantRouter,
  },
  {
    path: '/dashboard',
    route: dashboardRouter,
  },
  {
    path: '/meals',
    route: mealRouter,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
