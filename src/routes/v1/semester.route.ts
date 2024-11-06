import express from 'express';
import {
  createSemester as createSemesterController,
  findSemester as findSemesterController,
  getAllSemesters,
  updateSemester as updateSemesterController
} from '../../controllers/semester.controller.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import validate from '../../middlewares/validate.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';
import {
  createSemester,
  findSemester,
  getSemesters,
  updateSemester
} from '../../validations/semester.validation.js';

const router = express.Router();

const readSemesterGuard = guard(
  or(
    check(Actions.semester.read, DataAccessScopes.self.id),
    check(Actions.semester.read, DataAccessScopes.admin.id)
  )
);

const securityFilterParamsReadSemester: SecurityFilterParam[] = [
  { identifier: 'semesterReadScopes', action: Actions.semester.read }
];

const writeSemesterGuard = guard(or(check(Actions.semester.write, DataAccessScopes.admin.id)));

const securityFilterParamsWriteSemester: SecurityFilterParam[] = [
  { identifier: 'semesterWriteScopes', action: Actions.semester.write }
];

router
  .route('/')
  .post(
    verifyToken,
    requirePermissions(writeSemesterGuard),
    resolveSecurityFilters(securityFilterParamsWriteSemester),
    validate(createSemester),
    createSemesterController
  )
  .get(
    verifyToken,
    requirePermissions(readSemesterGuard),
    resolveSecurityFilters(securityFilterParamsReadSemester),
    validate(getSemesters),
    getAllSemesters
  );

router
  .route('/find')
  .get(
    verifyToken,
    requirePermissions(readSemesterGuard),
    resolveSecurityFilters(securityFilterParamsReadSemester),
    validate(findSemester),
    findSemesterController
  );

router
  .route('/:semesterId')
  .patch(
    verifyToken,
    requirePermissions(writeSemesterGuard),
    resolveSecurityFilters(securityFilterParamsWriteSemester),
    validate(updateSemester),
    updateSemesterController
  );

export default router;
