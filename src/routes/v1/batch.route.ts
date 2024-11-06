import express from 'express';
import { getAllBatches, getBatchesForOrganization } from '../../controllers/batch.controller.js';
import validate from '../../middlewares/validate.js';
import { getAllBatchesValidation, getBatchesByOrgId } from '../../validations/batch.validation.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';

const router = express.Router();

const readBatch = guard(
  or(
    check(Actions.batch.read, DataAccessScopes.admin.id),
    check(Actions.batch.read, DataAccessScopes.organization.id),
    check(Actions.batch.read, DataAccessScopes.supervisor.id),
    check(Actions.batch.read, DataAccessScopes.self.id)
  )
);

const securityFilterParamsBatchRead: SecurityFilterParam[] = [
  { identifier: 'batchReadScopes', action: Actions.batch.read }
];

router
  .route('/organizations/:orgId')
  .get(
    verifyToken,
    requirePermissions(readBatch),
    resolveSecurityFilters(securityFilterParamsBatchRead),
    validate(getBatchesByOrgId),
    getBatchesForOrganization
  );

router
  .route('/')
  .get(
    verifyToken,
    requirePermissions(readBatch),
    resolveSecurityFilters(securityFilterParamsBatchRead),
    validate(getAllBatchesValidation),
    getAllBatches
  );

export default router;
