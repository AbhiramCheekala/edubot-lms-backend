import express from 'express';
import organizationController from '../../controllers/organization.controller.js';
import {
  getOrganization,
  getOrganizations,
  updateOrganization
} from '../../validations/organization.validation.js';
import validate from '../../middlewares/validate.js';
import { createOrganization } from '../../validations/organization.validation.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';

const router = express.Router();

const readOrganization = guard(
  or(
    check(Actions.organization.read, DataAccessScopes.admin.id),
    check(Actions.organization.read, DataAccessScopes.organization.id),
    check(Actions.organization.read, DataAccessScopes.self.id),
    check(Actions.organization.read, DataAccessScopes.supervisor.id)
  )
);

const writeOrganization = guard(
  or(
    check(Actions.organization.write, DataAccessScopes.admin.id),
    check(Actions.organization.write, DataAccessScopes.organization.id)
  )
);

const securityFilterParamsOrganizationRead: SecurityFilterParam[] = [
  { identifier: 'organizationReadScopes', action: Actions.organization.read }
];

const securityFilterParamsOrganizationWrite: SecurityFilterParam[] = [
  { identifier: 'organizationWriteScopes', action: Actions.organization.write }
];

router
  .route('/')
  .post(
    verifyToken,
    requirePermissions(writeOrganization),
    resolveSecurityFilters(securityFilterParamsOrganizationWrite),
    validate(createOrganization),
    organizationController.createOrganization
  )
  .get(
    verifyToken,
    requirePermissions(readOrganization),
    resolveSecurityFilters(securityFilterParamsOrganizationRead),
    validate(getOrganizations),
    organizationController.getOrganizations
  );

router
  .route('/:orgId')
  .get(
    verifyToken,
    requirePermissions(readOrganization),
    resolveSecurityFilters(securityFilterParamsOrganizationRead),
    validate(getOrganization),
    organizationController.getOrganization
  )
  .patch(
    verifyToken,
    requirePermissions(writeOrganization),
    resolveSecurityFilters(securityFilterParamsOrganizationWrite),
    validate(updateOrganization),
    organizationController.updateOrganization
  );

export default router;
