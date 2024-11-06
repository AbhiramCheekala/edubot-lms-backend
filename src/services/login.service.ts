import { Login, LoginInsert, LoginJoined, LoginPartial } from '../db/schema/login.schema.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import httpStatus from 'http-status';
import {
  insertLogin,
  queryLoginByField,
  queryLoginByFieldUnsafe,
  updateLogin
} from '../models/login.model.js';
import { db, Schema } from '../db/db.js';
import ApiError from '../utils/ApiError.js';
import { encryptPassword, isPasswordMatch } from '../utils/encryption.js';
import exclude from '../utils/exclude.js';

export const findAccountByEmailUnsafe = async (
  email: string,
  transactionClient = db
): Promise<{
  account: Login;
}> => {
  const account: Login = (await queryLoginByFieldUnsafe(
    'email',
    email,
    transactionClient
  )) as Login;
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No account found with this email');
  }
  return { account };
};

export const findAccountByEmail = async (
  email: string,
  transactionClient = db
): Promise<{
  account: Login;
}> => {
  const account: Login = (await queryLoginByField('email', email, transactionClient)) as Login;
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No account found with this email');
  }
  return { account };
};

export const findAccountById = async (
  loginId: string,
  transactionClient = db
): Promise<{
  account: Partial<LoginJoined>;
}> => {
  const account = await queryLoginByField('loginId', loginId, transactionClient);
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No account found with this id');
  }
  return { account };
};

export const loginUserWithEmailAndPassword = async (
  email: string,
  password: string,
  transactionClient = db
): Promise<LoginPartial> => {
  const account = await queryLoginByFieldUnsafe('email', email, transactionClient);
  if (
    !account ||
    !account.passwordHash ||
    !(await isPasswordMatch(password, account.passwordHash!))
  ) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return exclude(account, ['passwordHash', 'createdAt', 'updatedAt']);
};

export async function createLogin(
  login: Omit<LoginInsert, 'updatedAt'>,
  transactionClient = db
): Promise<Login> {
  const account = await insertLogin(login, transactionClient);
  return account;
}

export async function modifyLoginRecordSafe(
  field: Extract<keyof Login, 'loginId' | 'email'>,
  key: string,
  login: Partial<Pick<LoginInsert, 'email' | 'role' | 'isVerified'>>,
  transactionClient = db
): Promise<Login> {
  const account = await updateLogin(field, key, login, transactionClient);
  return account;
}

export async function resetPassword(
  field: Extract<keyof Login, 'loginId' | 'email'>,
  key: string,
  newPassword: string,
  transactionClient: NodePgDatabase<Schema> = db
) {
  const encryptedPassword = await encryptPassword(newPassword);
  await updateLogin(field, key, { passwordHash: encryptedPassword }, transactionClient);
}
