import express from 'express';

import { getModuleById, postModule, putModule } from '../../controllers/module.controller.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import validate from '../../middlewares/validate.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';
import { createModule, findModule, modifyModule } from '../../validations/module.validation.js';

export const readModuleGuard = guard(
  or(
    check(Actions.module.read, DataAccessScopes.admin.id),
    check(Actions.module.read, DataAccessScopes.organization.id),
    check(Actions.module.read, DataAccessScopes.supervisor.id),
    check(Actions.module.read, DataAccessScopes.self.id)
  )
);

export const securityFilterParamsModuleRead: SecurityFilterParam[] = [
  { identifier: 'moduleReadScopes', action: Actions.module.read }
];

const writeModuleGuard = guard(or(check(Actions.module.write, DataAccessScopes.admin.id)));

const securityFilterParamsModuleWrite: SecurityFilterParam[] = [
  { identifier: 'moduleWriteScopes', action: Actions.module.write }
];

const router = express.Router();

router
  .route('/:moduleId')
  .get(
    verifyToken,
    requirePermissions(readModuleGuard),
    resolveSecurityFilters(securityFilterParamsModuleRead),
    validate(findModule),
    getModuleById
  )
  .put(
    verifyToken,
    requirePermissions(writeModuleGuard),
    resolveSecurityFilters(securityFilterParamsModuleWrite),
    validate(modifyModule),
    putModule
  );

router
  .route('/')
  .post(
    verifyToken,
    requirePermissions(writeModuleGuard),
    resolveSecurityFilters(securityFilterParamsModuleWrite),
    validate(createModule),
    postModule
  );

export default router;
