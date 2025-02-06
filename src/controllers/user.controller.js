const httpStatus = require('http-status');
const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const pick = require('../utils/pick');

const createUser = catchAsync(async (req, res) => {
  console.log("req.body",req.body);
  const user = await userService.createUserHandler(req.body);

  res.status(httpStatus.CREATED).json(ApiResponse.success(httpStatus.CREATED, 'User created successfully', user));
});

const getUsers = catchAsync(async (req, res) => {
  const filters = req.query;
  const users = await userService.fetchUsersHandler(filters);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'Users retrieved successfully', users));
});

const getUser = catchAsync(async (req, res) => {
  let { id } = pick(req.params, ['id']);

  id = parseInt(id, 10);

  const user = await userService.fetchUserByIdHandler(id);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'User retrieved successfully', user));
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUser(req.params.userId);
  res.status(httpStatus.OK).json(ApiResponse.success(httpStatus.OK, 'User deleted successfully'));
});

const userController = {
  createUser,
  getUsers,
  getUser,
  deleteUser,
};

module.exports = userController;
