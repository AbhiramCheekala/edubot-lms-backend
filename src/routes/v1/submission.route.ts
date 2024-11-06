import express from 'express';
import {
  getSubmission,
  getSubmissions,
  patchSubmission,
  postSubmission,
  putGradeForSubmission
} from '../../controllers/submission.controller.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import validate from '../../middlewares/validate.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';
import {
  applyGradeForSubmission,
  createSubmission,
  findMySubmissions,
  findSubmission,
  findSubmissions,
  updateSubmission
} from '../../validations/submission.validation.js';

const router = express.Router();

const readSubmission = guard(
  or(
    check(Actions.submission.read, DataAccessScopes.admin.id),
    check(Actions.submission.read, DataAccessScopes.organization.id),
    check(Actions.submission.read, DataAccessScopes.program.id),
    check(Actions.submission.read, DataAccessScopes.supervisor.id),
    check(Actions.submission.read, DataAccessScopes.self.id)
  )
);

const readMySubmission = guard(or(check(Actions.submission.read, DataAccessScopes.self.id)));

const writeSubmission = guard(or(check(Actions.submission.write, DataAccessScopes.self.id)));

const securityFilterParamsRead: SecurityFilterParam[] = [
  { identifier: 'submissionReadScopes', action: Actions.submission.read }
];

const securityFilterParamsWrite: SecurityFilterParam[] = [
  { identifier: 'submissionWriteScopes', action: Actions.submission.write }
];

const writeGradeGuard = guard(
  or(
    check(Actions.grade.write, DataAccessScopes.supervisor.id),
    check(Actions.grade.write, DataAccessScopes.admin.id)
  )
);

// const readGradeGuard = guard(
//   or(
//     check(Actions.submission.read, DataAccessScopes.supervisor.id),
//     check(Actions.submission.read, DataAccessScopes.admin.id),
//     check(Actions.submission.read, DataAccessScopes.self.id),
//     check(Actions.submission.read, DataAccessScopes.program.id),
//     check(Actions.submission.read, DataAccessScopes.organization.id)
//   )
// );

// const securityFilterParamsReadGrade: SecurityFilterParam[] = [
//   { identifier: 'gradeReadScopes', action: Actions.grade.read }
// ];

const securityFilterParamsWriteGrade: SecurityFilterParam[] = [
  { identifier: 'gradeWriteScopes', action: Actions.grade.write }
];

router
  .route('/')
  .get(
    verifyToken,
    requirePermissions(readSubmission),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(findSubmissions),
    getSubmissions
  )
  .post(
    verifyToken,
    requirePermissions(writeSubmission),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(createSubmission),
    postSubmission
  );

router
  .route('/my')
  .get(
    verifyToken,
    requirePermissions(readMySubmission),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(findMySubmissions),
    getSubmissions
  );

// router
//   .route('/:assignmentId/submissions/my')
//   .get(
//     verifyToken,
//     requirePermissions(readSubmission),
//     resolveSecurityFilters(securityFilterParamsRead),
//     validate(findAssignments),
//     getAssignments
//   );

router
  .route('/:submissionId')
  .get(
    verifyToken,
    requirePermissions(readSubmission),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(findSubmission),
    getSubmission
  )
  .patch(
    verifyToken,
    requirePermissions(writeSubmission),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(updateSubmission),
    patchSubmission
  );

router
  .route('/:submissionId/grade')
  .put(
    verifyToken,
    requirePermissions(writeGradeGuard),
    resolveSecurityFilters(securityFilterParamsWriteGrade),
    validate(applyGradeForSubmission),
    putGradeForSubmission
  );

export default router;
