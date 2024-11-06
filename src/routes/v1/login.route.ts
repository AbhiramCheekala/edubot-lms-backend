import express from 'express';
import loginController from '../../controllers/login.controller.js';
import validate from '../../middlewares/validate.js';
import loginValidation from '../../validations/login.validation.js';

const router = express.Router();

// router.post('/register', validate(loginValidation.register), loginController.register);
router.post('/login', validate(loginValidation.login), loginController.login);
router.post('/logout', validate(loginValidation.logout), loginController.logout);
router.post(
  '/refresh-token',
  validate(loginValidation.refreshTokens),
  loginController.refreshTokens
);
router.post(
  '/forgot-password',
  validate(loginValidation.forgotPassword),
  loginController.forgotPassword
);
router.post(
  '/reset-password',
  validate(loginValidation.resetPassword),
  loginController.putPassword
);
// router.post('/send-verification-email', loginController.sendVerificationEmail);
// router.post('/verify-email', validate(loginValidation.verifyEmail), loginController.verifyEmail);

export default router;
