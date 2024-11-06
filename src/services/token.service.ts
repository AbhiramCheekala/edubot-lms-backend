import { Login, LoginJoined } from 'db/schema/login.schema.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import moment, { Moment } from 'moment';
import config from '../config/config.js';
import { TokenTypes, TokenTypeValue } from '../constants/TokenTypes.js';
import { db, Schema } from '../db/db.js';
import { Token, TokenInsert, User } from '../db/schema/index.js';
import { TokenStudentObject } from '../middlewares/verifyToken.js';
import {
  deleteToken,
  getTokenByToken,
  getTokensByUserAndType,
  insertToken
} from '../models/token.model.js';
import { AuthTokensResponse } from '../types/response.js';
import ApiError from '../utils/ApiError.js';
import { findAccountById } from './login.service.js';
import roleService from './role.service.js';

export type TokenCustomData = {
  role: string;
  permissionSetName?: string;
  roleName?: string;
};

export type TokenPayload = {
  iat: Moment;
  exp: Moment;
  accountType: 'user' | 'student';
  email: string;
  role: string;
  loginId: string;
  type: TokenTypeValue;
  customData: TokenCustomData;
  student?: TokenStudentObject;
  user?: User;
};

export type TokenPayloadCustom = Omit<TokenPayload, 'iat'>;

const generateToken = (
  { loginId, exp, type, customData, accountType, email, role, student, user }: TokenPayloadCustom,
  secret = config.jwt.secret
): string => {
  const payload = {
    loginId,
    iat: moment().unix(),
    exp: exp.unix(),
    type,
    customData,
    accountType,
    email,
    role,
    ...(student ? { student } : {}),
    ...(user ? { user } : {})
  };
  return jwt.sign(payload, secret);
};

const saveToken = async (
  tokenObject: TokenInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Token> => {
  const createdToken = insertToken(tokenObject, transactionClient);
  return createdToken;
};

const verifyJwtStateless = ({
  token,
  ignoreExpiration = false
}: {
  token: string;
  ignoreExpiration?: boolean;
}): { payload: TokenPayload } => {
  const payload = jwt.verify(token, config.jwt.secret, {
    ignoreExpiration,
    maxAge: `${config.jwt.maxAgeDays} days`
  }) as unknown as TokenPayload;
  return {
    payload
  };
};

const verifyToken = async (
  { token, ignoreExpiration = false }: { token: string; ignoreExpiration?: boolean },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<{ tokenData: TokenPayload; account: LoginJoined; tokenDbRecord?: Token }> => {
  const { payload } = verifyJwtStateless({ token, ignoreExpiration });
  const { account } = await findAccountById(payload.loginId, transactionClient);
  if (payload.type === TokenTypes.access) {
    return {
      tokenData: { ...payload },
      account: account as unknown as LoginJoined
    };
  }
  const tokenDbRecord = await getTokenByToken(token, transactionClient);
  if (!tokenDbRecord) {
    throw new Error('Token not found');
  }
  if (tokenDbRecord.blacklisted) {
    throw new Error('Token is blacklisted');
  }
  return {
    tokenDbRecord,
    tokenData: { ...payload },
    account: account as unknown as LoginJoined
  };
};

const generateAuthTokens = async (
  {
    account
  }: {
    account: LoginJoined;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<AuthTokensResponse> => {
  const role = await roleService.getRoleById({ roleId: account.role }, transactionClient);
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken({
    loginId: account.loginId,
    exp: accessTokenExpires,
    type: TokenTypes.access,
    customData: {
      role: account.role,
      roleName: role.roleName,
      permissionSetName: role.permissionSetName
    },
    accountType: account.accountType,
    email: account.email,
    role: account.role,
    ...(account.accountType === 'student' ? { student: account.student } : {}),
    ...(account.accountType === 'user' ? { user: account.user } : {})
  });

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken({
    loginId: account.loginId,
    exp: refreshTokenExpires,
    type: TokenTypes.refresh,
    customData: {
      role: account.role,
      roleName: role.roleName,
      permissionSetName: role.permissionSetName
    },
    accountType: account.accountType,
    email: account.email,
    role: account.role
  });
  const refreshTokenDbRecord = await saveToken(
    {
      token: refreshToken,
      loginId: account.loginId,
      expires: refreshTokenExpires.toISOString(),
      type: TokenTypes.refresh,
      blacklisted: false,
      customData: { role: account.role }
    },
    transactionClient
  );

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate()
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
      tokenDbRecord: refreshTokenDbRecord as Token
    }
  };
};

const generateOnlyAccessToken = async (
  {
    account
  }: {
    account: LoginJoined;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Pick<AuthTokensResponse, 'access'>> => {
  const role = await roleService.getRoleById({ roleId: account.role }, transactionClient);
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken({
    loginId: account.loginId,
    exp: accessTokenExpires,
    type: TokenTypes.access,
    customData: {
      role: account.role,
      roleName: role.roleName,
      permissionSetName: role.permissionSetName
    },
    accountType: account.accountType,
    email: account.email,
    role: account.role,
    ...(account.accountType === 'student' ? { student: account.student } : {}),
    ...(account.accountType === 'user' ? { user: account.user } : {})
  });

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate()
    }
  };
};

const generateResetPasswordTokenWithChecks = async (
  {
    account,
    resetPasswordThresholdDays = config.jwt.resetPasswordThresholdDays,
    resetPasswordThresholdCount = config.jwt.resetPasswordThresholdCount
  }: { account: Login; resetPasswordThresholdDays?: number; resetPasswordThresholdCount?: number },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<{
  resetPasswordToken: string;
  tokenDbRecord: Token;
}> => {
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account not found');
  }

  if (account.isVerified === false) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Account not verified');
  }

  const resetPasswordTokens = await getTokensByUserAndType(
    account.loginId,
    TokenTypes.resetPassword,
    resetPasswordThresholdCount + 1,
    transactionClient
  );

  const tokensGeneratedInThresholdPeriod =
    resetPasswordTokens?.filter((token) =>
      moment(token.createdAt).isAfter(moment().subtract(resetPasswordThresholdDays, 'days'))
    ) ?? [];
  if (tokensGeneratedInThresholdPeriod.length > resetPasswordThresholdCount) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Too many reset password requests');
  }
  const { resetPasswordToken, tokenDbRecord } = await generateResetPasswordToken(
    { account },
    transactionClient
  );
  return { resetPasswordToken, tokenDbRecord };
};

const generateResetPasswordToken = async (
  { account }: { account: Login },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<{ resetPasswordToken: string; tokenDbRecord: Token }> => {
  const expires = moment().add(config.jwt.resetPasswordExpirationHours, 'hours');
  const resetPasswordToken = generateToken({
    loginId: account.loginId,
    accountType: account.accountType,
    email: account.email,
    role: account.role,
    exp: expires,
    type: TokenTypes.resetPassword,
    customData: { role: account.role }
  });
  const tokenDbRecord = (await saveToken(
    {
      token: resetPasswordToken,
      loginId: account.loginId,
      expires: expires.toISOString(),
      type: TokenTypes.resetPassword,
      blacklisted: false,
      customData: { role: account.role }
    },
    transactionClient
  )) as Token;
  return {
    resetPasswordToken,
    tokenDbRecord
  };
};

const generateVerifyEmailTokenWithChecks = async (
  {
    account,
    verifyAccountThresholdDays = config.jwt.verifyAccountThresholdDays,
    verifyAccountThresholdCount = config.jwt.verifyAccountThresholdCount
  }: { account: Login; verifyAccountThresholdDays?: number; verifyAccountThresholdCount?: number },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<{
  verifyEmailToken: string;
  tokenDbRecord: Token;
}> => {
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account not found');
  }

  if (account.isVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Account already verified');
  }

  const verifyEmailTokens = await getTokensByUserAndType(
    account.loginId,
    TokenTypes.verifyEmail,
    verifyAccountThresholdCount + 1,
    transactionClient
  );

  const tokensGeneratedInThresholdPeriod =
    verifyEmailTokens?.filter((token) =>
      moment(token.createdAt).isAfter(moment().subtract(verifyAccountThresholdDays, 'days'))
    ) ?? [];
  if (tokensGeneratedInThresholdPeriod.length > verifyAccountThresholdCount) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Too many verify email requests');
  }
  const { tokenDbRecord, verifyEmailToken } = await generateVerifyEmailToken(
    { account },
    transactionClient
  );
  return { verifyEmailToken, tokenDbRecord };
};

const generateVerifyEmailToken = async (
  { account }: { account: Login },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<{ verifyEmailToken: string; tokenDbRecord: Token }> => {
  const expires = moment().add(config.jwt.verifyEmailExpirationDays, 'days');
  const verifyEmailToken = generateToken({
    loginId: account.loginId,
    accountType: account.accountType,
    email: account.email,
    role: account.role,
    exp: expires,
    type: TokenTypes.verifyEmail,
    customData: { role: account.role }
  });
  const createdToken = (await saveToken(
    {
      token: verifyEmailToken,
      loginId: account.loginId,
      expires: expires.toISOString(),
      type: TokenTypes.verifyEmail,
      blacklisted: false,
      customData: { role: account.role }
    },
    transactionClient
  )) as Token;
  return {
    verifyEmailToken,
    tokenDbRecord: createdToken
  };
};

const removeToken = async (
  token: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> => {
  await deleteToken(token, transactionClient);
};

export default {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordTokenWithChecks,
  generateVerifyEmailTokenWithChecks,
  verifyJwtStateless,
  removeToken,
  generateOnlyAccessToken
};
