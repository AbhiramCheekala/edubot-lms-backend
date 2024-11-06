import express from 'express';
import programController from '../../controllers/program.controller.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import validate from '../../middlewares/validate.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import {
  cloneProgram,
  createProgram,
  getProgram,
  getPrograms,
  getStudentProgramMappings,
  patchStudentProgramMappings,
  updateProgram
} from '../../validations/program.validation.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!') as unknown as null, false);
    }
  }
});

const router = express.Router();

const readProgram = guard(
  or(
    check(Actions.program.read, DataAccessScopes.admin.id),
    check(Actions.program.read, DataAccessScopes.organization.id),
    check(Actions.program.read, DataAccessScopes.supervisor.id),
    check(Actions.program.read, DataAccessScopes.self.id)
  )
);

const writeProgram = guard(
  or(
    check(Actions.program.write, DataAccessScopes.admin.id),
    check(Actions.program.write, DataAccessScopes.organization.id),
    check(Actions.program.write, DataAccessScopes.supervisor.id),
    check(Actions.program.write, DataAccessScopes.self.id)
  )
);

// const securityFilterParamsRead: SecurityFilterParam[] = [
//   { identifier: 'courseReadScopes', action: Actions.course.read }
// ];

// const securityFilterParamsWrite: SecurityFilterParam[] = [
//   { identifier: 'courseReadScopes', action: Actions.course.read },
//   { identifier: 'courseWriteScopes', action: Actions.course.write }
// ];

const securityFilterParamsRead: SecurityFilterParam[] = [
  { identifier: 'programReadScopes', action: Actions.program.read }
];

const securityFilterParamsWrite: SecurityFilterParam[] = [
  { identifier: 'programReadScopes', action: Actions.program.read },
  { identifier: 'programWriteScopes', action: Actions.program.write }
];

router
  .route('/')
  .post(
    verifyToken,
    requirePermissions(writeProgram),
    resolveSecurityFilters(securityFilterParamsWrite),
    upload.single('banner'),
    validate(createProgram),
    programController.createProgram
  )
  .get(
    verifyToken,
    requirePermissions(readProgram),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(getPrograms),
    programController.getPrograms
  );

router
  .route('/:programId')
  .get(
    verifyToken,
    requirePermissions(readProgram),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(getProgram),
    programController.getProgram
  )
  .patch(
    verifyToken,
    requirePermissions(writeProgram),
    resolveSecurityFilters(securityFilterParamsWrite),
    upload.single('banner'),
    validate(updateProgram),
    programController.updateProgram
  );

router
  .route('/:programId/students')
  .patch(
    verifyToken,
    requirePermissions(writeProgram),
    validate(patchStudentProgramMappings),
    programController.patchStudentProgramMappings
  )
  .get(
    verifyToken,
    requirePermissions(readProgram),
    validate(getStudentProgramMappings),
    programController.getStudentProgramMappings
  );

router
  .route('/:programId/clone')
  .post(
    verifyToken,
    requirePermissions(writeProgram),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(cloneProgram),
    programController.cloneProgram
  );

export default router;
