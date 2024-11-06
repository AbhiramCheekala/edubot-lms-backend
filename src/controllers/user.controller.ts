import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { db, Schema } from '../db/db.js';
import {
  ContactPhoneNumber,
  LoginJoined,
  UserSearchColumn,
  UserSortColumn
} from '../db/schema/index.js';
import emailService from '../services/email.service.js';
import { userService } from '../services/index.js';
import tokenService from '../services/token.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { TokenTypes } from '../constants/TokenTypes.js';
import { getTokensByUserAndType } from '../models/token.model.js';
import { createLogin, findAccountById, modifyLoginRecordSafe } from '../services/login.service.js';
import roleService from '../services/role.service.js';
import { updateProgramMappingsForUser } from '../services/user.service.js';
import { encryptPassword, generateRandomPassword } from '../utils/encryption.js';
import { parseQuery, QueryField, ValidFieldType } from '../utils/helpers/parseFindAllQuery.js';
import { userFilterFields } from '../validations/user.validation.js';
import { deleteAllProgramMappingsForUser } from '../models/userProgramMap.model.js';
import { findAllBatches } from '../services/batch.service.js';
import { SEARCH_KEYS } from '../constants/SearchTypes.js';

interface UserQueryParams {
  includeRole: boolean;
  includeOrg: boolean;
  includePrograms: boolean;
}

const userSortFields: QueryField<string>[] = [
  { field: 'name', type: 'string' },
  { field: 'joiningDate', type: 'string' }
];

const createUser = catchAsync(async (req, res) => {
  const {
    email,
    name,
    role,
    contactPhoneNumber,
    organization,
    isActive,
    sendEmail,
    joiningDate,
    givenUserId,
    programMappings = []
  }: {
    email: string;
    name: string;
    role: string;
    contactPhoneNumber: ContactPhoneNumber;
    organization: string;
    isActive: boolean;
    sendEmail: boolean;
    joiningDate: string;
    givenUserId: string;
    programMappings: string[];
  } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      const roleObject = await roleService.getRoleById({ roleId: role }, transactionClient);
      const password = generateRandomPassword();
      const passwordHash = await encryptPassword(password);

      const account = await createLogin(
        { role, email, passwordHash, accountType: 'user' },
        transactionClient
      );

      const user = await userService.createUser(transactionClient, {
        user: {
          name,
          contactPhoneNumber,
          isActive,
          joiningDate,
          loginId: account.loginId,
          givenUserId
        }
      });

      await userService.addUserToOrganization(transactionClient, {
        orgId: organization,
        userId: user.id
      });

      // DANGER_TECH_DEBT IMPLICIT_ROLE_NAME_CHECK
      if (roleObject.roleName === 'Faculty' && programMappings?.length) {
        await updateProgramMappingsForUser(user.id, programMappings, transactionClient);
      }

      if (sendEmail) {
        const { verifyEmailToken } = await tokenService.generateVerifyEmailTokenWithChecks(
          {
            account
          },
          transactionClient
        );
        await emailService.sendVerificationEmail(
          { email, username: name, password },
          verifyEmailToken
        );
      }
      res.status(httpStatus.CREATED).send(user);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'User not created');
    }
  });
});

const getUsers = catchAsync(async (req, res) => {
  const parsedFindParams = parseQuery<
    UserSearchColumn,
    UserSortColumn,
    ValidFieldType,
    ValidFieldType
  >(req, userFilterFields, userSortFields);
  const securityFilters = req.securityFilters;
  const options = { ...parsedFindParams, securityFilters };
  const keys = undefined;
  const transactionClient = undefined;
  const result = await userService.queryUsersWithRolesAndOrgs(options, keys, transactionClient);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  let user;
  const { includeRole, includeOrg, includePrograms } = req.query as unknown as UserQueryParams;
  if (includeRole || includeOrg || includePrograms) {
    user = await userService.getUserByIdWithRolesAndOrgs({
      findValue: req.params.userId,
      includeRole,
      includeOrg,
      includePrograms
    });
  } else {
    user = await userService.getUserById({ findValue: req.params.userId });
  }
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res, next) => {
  const {
    email,
    name,
    role,
    contactPhoneNumber,
    organization,
    isActive,
    sendEmail,
    joiningDate,
    givenUserId,
    programMappings = []
  }: {
    email: string;
    name: string;
    role: string;
    contactPhoneNumber: ContactPhoneNumber;
    organization: string;
    isActive: boolean;
    sendEmail: boolean;
    joiningDate: string;
    givenUserId: string;
    programMappings: string[];
  } = req.body;
  const userId = req.params.userId;

  await db.transaction(async (transactionClient) => {
    try {
      let retObj = {};
      const {
        loginId,
        email: currentEmail,
        roleName,
        role: currentRole
      } = await userService.getUserById(
        { findValue: userId },
        ['loginId', 'email', 'roleName', 'role'],
        transactionClient
      );

      if (roleName === 'Mentor' && role !== currentRole) {
        const batchAssignments = await findAllBatches(
          1,
          1,
          undefined,
          false,
          [
            {
              searchColumn: 'mentorId',
              searchKey: userId,
              searchType: SEARCH_KEYS.EXACT_MATCH
            }
          ],
          undefined,
          undefined,
          transactionClient
        );
        if (batchAssignments?.results?.length) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Role cannot be changed for a mentor with batch assignments.'
          );
        }
      }

      if (!loginId) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      if (email || role) {
        await modifyLoginRecordSafe('loginId', loginId, { email, role }, transactionClient);
        retObj = { ...retObj, email, role };
      }

      if (
        [name, contactPhoneNumber, isActive, joiningDate, givenUserId].some((v) => v !== undefined)
      ) {
        const user = await userService.updateUserById(req.params.userId, transactionClient, {
          user: { name, contactPhoneNumber, isActive, joiningDate, givenUserId }
        });
        retObj = { ...retObj, ...user };
      }

      if (organization) {
        await userService.updateUserOrganization(transactionClient, {
          orgId: organization,
          userId: req.params.userId
        });
        retObj = { ...retObj, organization };
      }

      // DANGER_TECH_DEBT IMPLICIT_ROLE_NAME_CHECK
      if (roleName === 'Faculty' && programMappings?.length) {
        await updateProgramMappingsForUser(req.params.userId, programMappings, transactionClient);
      } else {
        await deleteAllProgramMappingsForUser(req.params.userId, transactionClient);
      }

      if (sendEmail) {
        const emailStatus = await sendEmailForUpdateUser(
          { loginId, email: email ?? currentEmail, username: name },
          transactionClient
        );
        if (emailStatus === 'VERIFICATION_ALERADY_IN_PROGRESS') {
          throw new ApiError(httpStatus.CONFLICT, 'Account erification email already in progress');
        }
      }

      res.status(httpStatus.ACCEPTED).send(retObj);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.CONFLICT, 'User not updated'));
    }
  });
});

async function sendEmailForUpdateUser(
  { loginId, email, username }: { loginId: string; email: string; username: string },
  transactionClient: NodePgDatabase<Schema>
): Promise<string> {
  const { account } = await findAccountById(loginId, transactionClient);
  if (account.isVerified === false) {
    const verifyEmailTokens = await getTokensByUserAndType(
      account.loginId!,
      TokenTypes.verifyEmail,
      1,
      transactionClient
    );
    if (verifyEmailTokens?.length) {
      try {
        tokenService.verifyJwtStateless({ token: verifyEmailTokens[0].token });
        return 'VERIFICATION_ALERADY_IN_PROGRESS';
      } catch (error) {
        await tokenService.removeToken(verifyEmailTokens[0].token, transactionClient);
      }
    }
    const { verifyEmailToken } = await tokenService.generateVerifyEmailTokenWithChecks(
      {
        account: account as unknown as LoginJoined
      },
      transactionClient
    );
    await emailService.sendVerificationEmail({ email, username }, verifyEmailToken);
    return 'VERIFICATION_EMAIL_SENT';
  } else {
    const resetPasswordToken = await tokenService.generateResetPasswordTokenWithChecks(
      {
        account: account as unknown as LoginJoined
      },
      transactionClient
    );
    await emailService.sendResetPasswordEmail(
      { email, username },
      resetPasswordToken.resetPasswordToken
    );
    return 'RESET_PASSWORD_EMAIL_SENT';
  }
}

// const deleteUser = catchAsync(async (req, res) => {
//   await userService.deleteUserById(req.params.userId);
//   res.status(httpStatus.NO_CONTENT).send();
// });

export default {
  createUser,
  getUsers,
  getUser,
  updateUser
  // deleteUser
};
