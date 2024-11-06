import express from 'express';
import {
  createStudent as createStudentController,
  getStudent as getStudentController,
  getStudentCourseMappings,
  getStudentProgramMappings,
  getStudents as getStudentsController,
  patchStudentCourseMappings,
  patchStudentProfile,
  patchStudentProfilePicture,
  patchStudentProgramMappings,
  updateStudent as updateStudentController
} from '../../controllers/student.controller.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import validate from '../../middlewares/validate.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';
import {
  createStudent,
  findStudentCourseMappings,
  findStudentProgramMappings,
  getStudent,
  getStudents,
  updateStudent,
  updateStudentCourseMappings,
  updateStudentProfile,
  updateStudentProfilePicture,
  updateStudentProgramMappings
} from '../../validations/student.validation.js';
import multer from 'multer';
const router = express.Router();
const readStudents = guard(
  or(
    check(Actions.student.read, DataAccessScopes.admin.id),
    check(Actions.student.read, DataAccessScopes.organization.id),
    check(Actions.student.read, DataAccessScopes.program.id),
    check(Actions.student.read, DataAccessScopes.supervisor.id),
    check(Actions.student.read, DataAccessScopes.self.id)
  )
);

const securityFilterParamsRead: SecurityFilterParam[] = [
  { identifier: 'studentReadScopes', action: Actions.student.read }
];

const writeStudentGuard = guard(
  or(
    check(Actions.student.write, DataAccessScopes.admin.id),
    check(Actions.student.write, DataAccessScopes.organization.id),
    check(Actions.student.write, DataAccessScopes.program.id),
    check(Actions.student.write, DataAccessScopes.supervisor.id),
    check(Actions.student.write, DataAccessScopes.self.id)
  )
);

const securityFilterParamsWrite: SecurityFilterParam[] = [
  { identifier: 'studentWriteScopes', action: Actions.student.write }
];

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

router
  .route('/')
  .get(
    verifyToken,
    requirePermissions(readStudents),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(getStudents),
    getStudentsController
  )
  .post(
    verifyToken,
    requirePermissions(writeStudentGuard),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(createStudent),
    createStudentController
  );

router
  .route('/:studentId')
  .get(
    verifyToken,
    requirePermissions(readStudents),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(getStudent),
    getStudentController
  )
  .patch(
    verifyToken,
    requirePermissions(writeStudentGuard),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(updateStudent),
    updateStudentController
  );
// .delete(validate(studentValidation.deleteUser), studentController.deleteUser);

router
  .route('/:studentId/courses')
  .patch(validate(updateStudentCourseMappings), patchStudentCourseMappings)
  .get(validate(findStudentCourseMappings), getStudentCourseMappings);

router
  .route('/:studentId/programs')
  .patch(validate(updateStudentProgramMappings), patchStudentProgramMappings)
  .get(validate(findStudentProgramMappings), getStudentProgramMappings);

// Add this new route after the existing update route
router
  .route('/:studentId/profile')
  .patch(
    verifyToken,
    requirePermissions(guard(or(check(Actions.student.write, DataAccessScopes.self.id)))),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(updateStudentProfile),
    patchStudentProfile
  );

router
  .route('/:studentId/profile-picture')
  .patch(
    verifyToken,
    requirePermissions(guard(or(check(Actions.student.write, DataAccessScopes.self.id)))),
    resolveSecurityFilters(securityFilterParamsWrite),
    upload.single('profilePicture'),
    validate(updateStudentProfilePicture),
    patchStudentProfilePicture
  );

export default router;
