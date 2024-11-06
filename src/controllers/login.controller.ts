import { logger } from '@azure/storage-blob';
import httpStatus from 'http-status';
import { TokenTypes } from '../constants/TokenTypes.js';
import { db } from '../db/db.js';
import { LoginJoined } from '../db/schema/index.js';
import { getTokensByUserAndType } from '../models/token.model.js';
import emailService from '../services/email.service.js';
import {
  findAccountByEmail,
  loginUserWithEmailAndPassword,
  modifyLoginRecordSafe,
  resetPassword
} from '../services/login.service.js';
import { findStudentByEmail } from '../services/student.service.js';
import tokenService from '../services/token.service.js';
import userService from '../services/user.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { addDays, isAfter } from 'date-fns';
import { AuthTokensResponse } from '../types/response.js';

const login = catchAsync(async (req, res, next) => {
  await db.transaction(async (transactionClient) => {
    try {
      const { email, password } = req.body;
      const account = (await loginUserWithEmailAndPassword(email, password)) as LoginJoined;
      if (account.isVerified === false) {
        // const verifyEmailTokens = await getTokensByUserAndType(
        //   account.loginId,
        //   TokenTypes.verifyEmail,
        //   1,
        //   transactionClient
        // );
        // if (verifyEmailTokens?.length) {
        //   try {
        //     tokenService.verifyJwtStateless({ token: verifyEmailTokens[0].token });
        //     return res
        //       .status(httpStatus.SEE_OTHER)
        //       .redirect(
        //         `${config.edubotLmsUiBaseUrl}/reset-password?token=${verifyEmailTokens[0].token}`
        //       );
        //   } catch (error) {
        //     await tokenService.removeToken(verifyEmailTokens[0].token, transactionClient);
        //   }
        // }
        // const { verifyEmailToken } = await tokenService.generateVerifyEmailTokenWithChecks(
        //   {
        //     account
        //   },
        //   transactionClient
        // );
        // return res
        //   .status(httpStatus.SEE_OTHER)
        //   .redirect(`${config.edubotLmsUiBaseUrl}/reset-password?token=${verifyEmailToken}`);
        await modifyLoginRecordSafe(
          'loginId',
          account.loginId,
          { isVerified: true },
          transactionClient
        );
        const authTokenResponse = await tokenService.generateAuthTokens(
          { account },
          transactionClient
        );
        res.send({ account, authTokenResponse });
      } else {
        const authTokenResponse = await tokenService.generateAuthTokens(
          { account },
          transactionClient
        );
        res.send({ account, authTokenResponse });
      }
    } catch (error: any) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});

const logout = catchAsync(async (req, res, next) => {
  await db.transaction(async (transactionClient) => {
    try {
      await tokenService.removeToken(req.body.refreshToken);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error: any) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});

const refreshTokens = catchAsync(async (req, res, next) => {
  await db.transaction(async (transactionClient) => {
    try {
      const refreshToken = req.body.refreshToken;
      if (!refreshToken) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token is required');
      }

      let account, tokenDbRecord;
      try {
        ({ account, tokenDbRecord } = await tokenService.verifyToken(
          {
            token: refreshToken
          },
          transactionClient
        ));
      } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'EDUBOT_INVALID_TOKEN_TRIGGER_LOGOUT');
      }

      let authTokenResponse: AuthTokensResponse;

      // Check if the token is not expired and has more than 2 days until expiry
      const twoDaysFromNow = addDays(new Date(), 3);
      if (tokenDbRecord && isAfter(new Date(tokenDbRecord.expires), twoDaysFromNow)) {
        // Use the existing refresh token
        authTokenResponse = {
          ...(await tokenService.generateOnlyAccessToken({ account })),
          refresh: {
            token: refreshToken,
            expires: new Date(tokenDbRecord.expires),
            tokenDbRecord
          }
        };
      } else {
        // Generate new refresh token
        authTokenResponse = await tokenService.generateAuthTokens({ account }, transactionClient);
        // Remove the old refresh token
        // await tokenService.removeToken(refreshToken, transactionClient);
      }

      res.send({ account, authTokenResponse });
    } catch (error: any) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});

const forgotPassword = catchAsync(async (req, res, next) => {
  await db.transaction(async (transactionClient) => {
    try {
      const email = req.body.email;
      const { account } = await findAccountByEmail(email, transactionClient);
      let username = '';
      if (account.accountType === 'student') {
        const student = await findStudentByEmail(
          {
            findValue: account.email
          },
          ['name'],
          transactionClient
        );
        username = student!.name as string;
      } else if (account.accountType === 'user') {
        const user = await userService.getUserByEmail(
          {
            findValue: account.email
          },
          ['name'],
          transactionClient
        );
        username = user!.name as string;
      }
      if (account.isVerified === false) {
        const verifyEmailTokens = await getTokensByUserAndType(
          account.loginId,
          TokenTypes.verifyEmail,
          1,
          transactionClient
        );
        if (verifyEmailTokens?.length) {
          try {
            tokenService.verifyJwtStateless({ token: verifyEmailTokens[0].token });
            return res.status(httpStatus.TOO_EARLY).send('Account verification pending.');
            // await emailService.sendVerificationEmail(
            //   { email, username },
            //   verifyEmailTokens[0].token
            // );
            // return res.status(httpStatus.NO_CONTENT).send();
          } catch (error) {
            await tokenService.removeToken(verifyEmailTokens[0].token, transactionClient);
          }
        }
        const { verifyEmailToken } = await tokenService.generateVerifyEmailTokenWithChecks(
          {
            account
          },
          transactionClient
        );
        await emailService.sendVerificationEmail({ email, username }, verifyEmailToken);
        return res.status(httpStatus.NO_CONTENT).send();
      } else {
        const resetPasswordToken = await tokenService.generateResetPasswordTokenWithChecks(
          {
            account
          },
          transactionClient
        );
        await emailService.sendResetPasswordEmail(
          { email: req.body.email, username },
          resetPasswordToken.resetPasswordToken
        );
        return res.status(httpStatus.NO_CONTENT).send();
      }
    } catch (error: any) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});

const putPassword = catchAsync(async (req, res, next) => {
  await db.transaction(async (transactionClient) => {
    try {
      const { token } = req.query;
      const { password } = req.body;
      const { account, tokenDbRecord } = await tokenService.verifyToken({
        token: token as string
      });
      if (
        !tokenDbRecord ||
        !([TokenTypes.verifyEmail, TokenTypes.resetPassword] as string[]).includes(
          tokenDbRecord.type
        )
      ) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid token');
      }
      await resetPassword('loginId', account.loginId, password as string, transactionClient);
      if (account.isVerified === false) {
        await modifyLoginRecordSafe(
          'loginId',
          account.loginId,
          { isVerified: true },
          transactionClient
        );
      }
      await tokenService.removeToken(token as string, transactionClient);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error: any) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});

export default {
  login,
  logout,
  refreshTokens,
  forgotPassword,
  putPassword
};
