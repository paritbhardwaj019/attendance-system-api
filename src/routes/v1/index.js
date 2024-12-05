const express = require('express');
const authRouter = require('./auth.route');
const userRouter = require('./user.route');
const managerRouter = require('./manager.route');
const attendanceRouter = require('./attendance.route');
const visitorRouter = require('./visitor.route');

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
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
