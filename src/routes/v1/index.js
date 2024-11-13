const express = require('express');
const authRouter = require('./auth.route');
const userRouter = require('./user.route');

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
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
