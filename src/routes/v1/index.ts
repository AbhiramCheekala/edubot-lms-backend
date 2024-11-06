import express, { Request, Response } from 'express';
import loginRoute from './login.route.js';
import batchRoute from './batch.route.js';
import roleRoute from './role.route.js';
import studentRoute from './student.route.js';
import userRoute from './user.route.js';
// import docsRoute from './docs.route.js';
import organizationRoute from './organization.route.js';
import semesterRoute from './semester.route.js';
import programRoute from './program.route.js';
import courseRoute from './course.route.js';
import contentRoute from './content.route.js';
import moduleRoute from './module.route.js';
import assignmentRoute from './assignment.route.js';
import submissionRoute from './submission.route.js';
import policyRoute from './policy.route.js';
import readingMaterialNoteRoute from './readingMaterialNote.route.js';
import miscPlatformDataRoute from './miscPlatformData.route.js';
import githubTestCaseTokenRoute from './githubTestCaseToken.route.js';
import binaryObjectRoute from './binaryObject.route.js';
// import config from '../../config/config.js';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: loginRoute
  },
  {
    path: '/health',
    route: (req: Request, res: Response) => res.send('OK')
  },
  {
    path: '/users',
    route: userRoute
  },
  {
    path: '/roles',
    route: roleRoute
  },
  {
    path: '/organizations',
    route: organizationRoute
  },
  {
    path: '/semesters',
    route: semesterRoute
  },
  {
    path: '/students',
    route: studentRoute
  },
  {
    path: '/batches',
    route: batchRoute
  },
  {
    path: '/programs',
    route: programRoute
  },
  {
    path: '/courses',
    route: courseRoute
  },
  {
    path: '/contents',
    route: contentRoute
  },
  {
    path: '/modules',
    route: moduleRoute
  },
  {
    path: '/assignments',
    route: assignmentRoute
  },
  {
    path: '/submissions',
    route: submissionRoute
  },
  {
    path: '/policies',
    route: policyRoute
  },
  {
    path: '/rmnotes',
    route: readingMaterialNoteRoute
  },
  {
    path: '/misc-platform-data',
    route: miscPlatformDataRoute
  },
  {
    path: '/github-test-case-tokens',
    route: githubTestCaseTokenRoute
  },
  {
    path: '/binary-objects',
    route: binaryObjectRoute
  }
];

// const devRoutes = [
//   // routes available only in development mode
// ];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
// TODO maybe change it back to development later
// if (config.env === 'development') {
// devRoutes.forEach((route) => {
//   router.use(route.path, route.route);
// });
// }

export default router;
