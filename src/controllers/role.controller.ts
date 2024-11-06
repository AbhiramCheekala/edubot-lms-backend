import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import roleService from '../services/role.service.js';

const getRoles = catchAsync(async (req, res) => {
  const transactionClient = undefined;
  const result = await roleService.queryRoles(transactionClient);
  res.send(result);
});

const getRole = catchAsync(async (req, res) => {
  const transactionClient = undefined;
  const role = await roleService.getRoleById({ roleId: req.params.roleId }, transactionClient);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
  res.send(role);
});

export default {
  getRoles,
  getRole
};
