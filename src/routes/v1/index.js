const express = require('express');
const authRouter = require('./auth.route');
const userRouter = require('./user.route');
const managerRouter = require('./manager.route');
const attendanceRouter = require('./attendance.route');
const visitorRouter = require('./visitor.route');
const cameraRouter = require('./camera.route');
const reportRouter = require('./report.route');

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
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
