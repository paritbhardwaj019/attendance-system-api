const httpStatus = require('http-status');
const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const { getPagination } = require('../utils/pagination');

const createUser = catchAsync(async (req, res) => {
  const createdUser = await userService.createUser(req.body);
  res.status(httpStatus.OK).send(createdUser);
});

const deleteUser = catchAsync(async (req, res) => {
  const deletedUser = await userService.deleteUser(req.params.id);
  res.status(httpStatus.OK).send(deletedUser);
});

const fetchUserDetails = catchAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = await userService.getUserDetails(id);
  res.status(httpStatus.OK).send(user);
});

const listUsers = catchAsync(async (req, res) => {
  const { page = '1', limit = '10', user_type, search } = req.query;

  const pagination = getPagination(parseInt(page, 10), parseInt(limit, 10));

  const filters = {
    user_type,
    search,
  };

  const user = await userService.listUsers(filters, pagination);
  res.status(httpStatus.OK).send(user);
});

const userController = {
  createUser,
  deleteUser,
  fetchUserDetails,
  listUsers,
};

module.exports = userController;
