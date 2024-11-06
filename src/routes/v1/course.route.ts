import express from 'express';
import { courseController } from '../../controllers/index.js';
import { getModulesByCourseId } from '../../controllers/module.controller.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import validate from '../../middlewares/validate.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';
import {
  findCourseModules,
  getStudentCourseMappings,
  patchStudentCourseMappings
} from '../../validations/course.validation.js';
import { courseValidation } from '../../validations/index.js';
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

const readCourse = guard(
  or(
    check(Actions.course.read, DataAccessScopes.admin.id),
    check(Actions.course.read, DataAccessScopes.organization.id),
    check(Actions.course.read, DataAccessScopes.supervisor.id),
    check(Actions.course.read, DataAccessScopes.self.id)
  )
);

const writeCourse = guard(
  or(
    check(Actions.course.write, DataAccessScopes.admin.id),
    check(Actions.course.write, DataAccessScopes.organization.id)
  )
);

const securityFilterParamsRead: SecurityFilterParam[] = [
  { identifier: 'courseReadScopes', action: Actions.course.read }
];

const securityFilterParamsWrite: SecurityFilterParam[] = [
  { identifier: 'courseReadScopes', action: Actions.course.read },
  { identifier: 'courseWriteScopes', action: Actions.course.write }
];

router
  .route('/')
  .post(
    verifyToken,
    requirePermissions(writeCourse),
    resolveSecurityFilters(securityFilterParamsWrite),
    upload.single('banner'),
    validate(courseValidation.createCourse),
    courseController.postCourse
  )
  .get(
    verifyToken,
    requirePermissions(readCourse),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(courseValidation.getCourses),
    courseController.getCourses
  );

router
  .route('/:courseId')
  .get(
    verifyToken,
    requirePermissions(readCourse),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(courseValidation.getCourse),
    courseController.getCourse
  )
  .patch(
    verifyToken,
    requirePermissions(writeCourse),
    resolveSecurityFilters(securityFilterParamsWrite),
    upload.single('banner'),
    validate(courseValidation.patchCourse),
    courseController.patchCourse
  );

router
  .route('/:courseId/modules')
  .get(
    verifyToken,
    requirePermissions(readCourse),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(findCourseModules),
    getModulesByCourseId
  );

router
  .route('/:courseId/students')
  .patch(
    verifyToken,
    // requirePermissions(writeCourse),
    // resolveSecurityFilters(securityFilterParamsWrite),
    validate(patchStudentCourseMappings),
    courseController.patchStudentCourseMappings
  )
  .get(
    verifyToken,
    // requirePermissions(readCourse),
    // resolveSecurityFilters(securityFilterParamsRead),
    validate(getStudentCourseMappings),
    courseController.getStudentCourseMappings
  );

router
  .route('/:courseId/clone')
  .post(
    verifyToken,
    requirePermissions(writeCourse),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(courseValidation.cloneCourse),
    courseController.cloneCourse
  );

export default router;
