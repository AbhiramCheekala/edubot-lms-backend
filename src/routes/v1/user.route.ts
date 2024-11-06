import express from 'express';
import { userController } from '../../controllers/index.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import validate from '../../middlewares/validate.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { userValidation } from '../../validations/index.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';

const router = express.Router();

const readUser = guard(
  or(
    check(Actions.user.read, DataAccessScopes.admin.id),
    check(Actions.user.read, DataAccessScopes.organization.id),
    // check(Actions.user.read, DataAccessScopes.supervisor.id)
    check(Actions.user.read, DataAccessScopes.self.id)
  )
);

const writeUser = guard(or(check(Actions.user.write, DataAccessScopes.admin.id)));

const securityFilterParamsRead: SecurityFilterParam[] = [
  { identifier: 'userReadScopes', action: Actions.user.read }
];
const securityFilterParamsWrite: SecurityFilterParam[] = [
  { identifier: 'userWriteScopes', action: Actions.user.write }
];

router
  .route('/')
  .post(
    // verifyToken,
    // requirePermissions(writeUser),
    // resolveSecurityFilters(securityFilterParamsWrite),
    validate(userValidation.createUser),
    userController.createUser
  )
  .get(
    verifyToken,
    requirePermissions(readUser),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(userValidation.getUsers),
    userController.getUsers
  );

router
  .route('/:userId')
  .get(
    verifyToken,
    requirePermissions(readUser),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(userValidation.getUser),
    userController.getUser
  )
  .patch(
    verifyToken,
    requirePermissions(writeUser),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(userValidation.updateUser),
    userController.updateUser
  );
// .delete(validate(userValidation.deleteUser), userController.deleteUser);

export default router;
