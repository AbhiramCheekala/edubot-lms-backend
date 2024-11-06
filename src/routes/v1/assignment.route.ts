import express from 'express';
import { getAssignments } from '../../controllers/assignment.controller.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import validate from '../../middlewares/validate.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { findAssignments } from '../../validations/assignment.validation.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';

const readAssignment = guard(
  or(
    check(Actions.assignment.read, DataAccessScopes.admin.id),
    check(Actions.assignment.read, DataAccessScopes.organization.id),
    check(Actions.assignment.read, DataAccessScopes.supervisor.id),
    check(Actions.assignment.read, DataAccessScopes.self.id)
  )
);

const securityFilterParamsAssignmentRead: SecurityFilterParam[] = [
  { identifier: 'assignmentReadScopes', action: Actions.assignment.read },
  { identifier: 'submissionReadScopes', action: Actions.submission.read }
];

const router = express.Router();

router
  .route('/')
  .get(
    verifyToken,
    requirePermissions(readAssignment),
    resolveSecurityFilters(securityFilterParamsAssignmentRead),
    validate(findAssignments),
    getAssignments
  );

export default router;
