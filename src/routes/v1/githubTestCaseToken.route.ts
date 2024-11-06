// import express from 'express';
// import loginController from '../../controllers/login.controller.js';
// import validate from '../../middlewares/validate.js';
// import loginValidation from '../../validations/login.validation.js';

// const router = express.Router();

// // router.post('/register', validate(loginValidation.register), loginController.register);
// router.post('/login', validate(loginValidation.login), loginController.login);
// router.post('/logout', validate(loginValidation.logout), loginController.logout);
// router.post(
//   '/refresh-token',
//   validate(loginValidation.refreshTokens),
//   loginController.refreshTokens
// );
// router.post(
//   '/forgot-password',
//   validate(loginValidation.forgotPassword),
//   loginController.forgotPassword
// );
// router.post(
//   '/reset-password',
//   validate(loginValidation.resetPassword),
//   loginController.putPassword
// );
// // router.post('/send-verification-email', loginController.sendVerificationEmail);
// // router.post('/verify-email', validate(loginValidation.verifyEmail), loginController.verifyEmail);

// export default router;

// create token for github test case

import { eq, or } from 'drizzle-orm';
import express from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import { db } from '../../db/db.js';
import { GithubTestCaseTokenTable } from '../../db/schema/githubTestCaseToken.schema.js';
import { verifyToken } from '../../middlewares/verifyToken.js';

const router = express.Router();

router.post('/create-token', verifyToken, async (req, res) => {
  const loginId = req.accountInfo?.loginId;
  const { assignmentId, githubRepoFullName } = req.body;
  if (!loginId || !assignmentId || !githubRepoFullName) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  await db.transaction(async (tx) => {
    try {
      const existingToken = await tx.query.GithubTestCaseTokenTable.findFirst({
        where: or(
          eq(GithubTestCaseTokenTable.loginId, loginId),
          eq(GithubTestCaseTokenTable.assignmentId, assignmentId),
          eq(GithubTestCaseTokenTable.githubRepoFullName, githubRepoFullName)
        )
      });
      if (existingToken) {
        return res.status(400).json({ error: 'Token already exists for this combination' });
      }
      const payload = {
        loginId,
        assignmentId,
        githubRepoFullName,
        type: 'github-test-case',
        createdAt: new Date().toISOString()
      };
      // no expiry
      const token = jwt.sign(payload, config.jwt.secret);
      await tx.insert(GithubTestCaseTokenTable).values({
        loginId,
        assignmentId,
        githubRepoFullName,
        token
      });
      res.json({ token });
    } catch (error) {
      console.error(error);
      tx.rollback();
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

router.post('/find-token', verifyToken, async (req, res) => {
  const loginId = req.accountInfo?.loginId;
  const { assignmentId, githubRepoFullName } = req.body;
  if (!loginId || !assignmentId || !githubRepoFullName) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const token = await db.query.GithubTestCaseTokenTable.findFirst({
    where: or(
      eq(GithubTestCaseTokenTable.loginId, loginId),
      eq(GithubTestCaseTokenTable.assignmentId, assignmentId),
      eq(GithubTestCaseTokenTable.githubRepoFullName, githubRepoFullName)
    )
  });
  res.json({ token });
});

router.post('/results', async (req, res) => {
  const bearerHeader = req.headers['authorization'];

  if (!bearerHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const bearer = bearerHeader.split(' ');
  const bearerToken = bearer[1];

  try {
    const decoded = jwt.verify(bearerToken, config.jwt.secret);
    const logData = {
      decoded,
      body: req.body
    };
    console.log(JSON.stringify(logData, null, 2));
    res.json({ message: 'success', logData });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/results-temp-bouncer', async (req, res) => {
  const bearerHeader = req.headers['authorization'];

  if (!bearerHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const bearer = bearerHeader.split(' ');
  const bearerToken = bearer[1];

  try {
    const [headerB64, payloadB64] = bearerToken.split('.');
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));
    const decoded = {
      header,
      payload
    };
    const logData = {
      decoded,
      body: req.body
    };
    console.log(JSON.stringify(logData, null, 2));
    res.json({ message: 'success', logData });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
