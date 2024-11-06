import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { TokenTypes } from '../constants/TokenTypes.js';
import { db, Schema } from '../db/db.js';
import {
  ContactPhoneNumber,
  LoginJoined,
  StudentSearchColumn,
  StudentSortColumn
} from '../db/schema/index.js';
import { getTokensByUserAndType } from '../models/token.model.js';
import {
  createBinaryObjectRecord,
  uploadFileToBlobStorage
} from '../services/binaryObject.service.js';
import emailService from '../services/email.service.js';
import { createLogin, findAccountById, modifyLoginRecordSafe } from '../services/login.service.js';
import { getRoleByName } from '../services/role.service.js';
import {
  addStudentToCourses,
  addStudentToPrograms,
  createStudent as createStudentService,
  findAllStudents,
  findCoursesForStudent,
  findProgramsForStudent,
  findStudentById,
  removeStudentFromCourses,
  removeStudentFromPrograms,
  updateStudentById
} from '../services/student.service.js';
import tokenService from '../services/token.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { encryptPassword, generateRandomPassword } from '../utils/encryption.js';
import { getPublicContainerStorageAccountName } from '../utils/helpers/azureStorage.helpers.js';
import {
  FilterField,
  parseQuery,
  QueryField,
  ValidFieldType
} from '../utils/helpers/parseFindAllQuery.js';

const studentFilterFields: FilterField<string>[] = [
  { field: 'name', type: 'string' },
  { field: 'givenStudentId', type: 'string' },
  { field: 'email', type: 'string' },
  { field: 'orgName', type: 'string' },
  { field: 'batchId', type: 'string' },
  { field: 'isActive', type: 'boolean' }
];

const studentSortFields: QueryField<string>[] = [
  { field: 'name', type: 'string' },
  { field: 'givenStudentId', type: 'string' },
  { field: 'email', type: 'string' },
  { field: 'orgName', type: 'string' }
];

interface StudentQueryParams {
  includeRole: boolean;
  includeOrg: boolean;
  includeBatch: boolean;
  includeMentor: boolean;
}

export const createStudent = catchAsync(async (req, res, next) => {
  const {
    email,
    name,
    contactPhoneNumber,
    organization,
    isActive,
    sendEmail,
    joiningDate,
    givenStudentId,
    apsche,
    gender,
    batchId,
    personalEmail,
    dateOfBirth
  }: {
    email: string;
    name: string;
    contactPhoneNumber: ContactPhoneNumber;
    organization: string;
    isActive: boolean;
    sendEmail: boolean;
    joiningDate: string;
    givenStudentId: string;
    apsche: boolean;
    gender: string;
    batchId: string;
    personalEmail?: string;
    dateOfBirth: Date;
  } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      const role = await getRoleByName({ roleName: 'Student' });
      if (!role) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
      }
      const password = generateRandomPassword();
      const passwordHash = await encryptPassword(password);

      const account = await createLogin(
        { role: role.id!, email, passwordHash, accountType: 'student' },
        transactionClient
      );

      const student = await createStudentService({
        transactionClient,
        student: {
          givenStudentId,
          name,
          personalEmail,
          dateOfBirth,
          apsche,
          gender,
          orgId: organization,
          batchId,
          loginId: account.loginId,
          joiningDate,
          contactPhoneNumber,
          isActive
        }
      });

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

      res.status(httpStatus.CREATED).send(student);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.CONFLICT, 'Student not created'));
    }
  });
});

export const getStudents = catchAsync(async (req, res) => {
  const {
    includeRole,
    includeOrg,
    includeBatch,
    includeMentor
  }: { includeRole: boolean; includeOrg: boolean; includeBatch: boolean; includeMentor: boolean } =
    req.query as unknown as StudentQueryParams;
  const parsedFindParams = parseQuery<
    StudentSearchColumn,
    StudentSortColumn,
    ValidFieldType,
    ValidFieldType
  >(req, studentFilterFields, studentSortFields);
  const page = req.query.page as unknown as number;
  const limit = req.query.limit as unknown as number;
  const options = {
    page,
    limit,
    includeRole,
    includeOrg,
    includeBatch,
    includeMentor,
    securityFilters: req.securityFilters,
    ...parsedFindParams
  };
  const keys = undefined;
  const transactionClient = undefined;
  const result = await findAllStudents(options, keys, transactionClient);
  res.send(result);
});

export const getStudent = catchAsync(async (req, res, next) => {
  const {
    includeRole,
    includeOrg,
    includeBatch
  }: { includeRole: boolean; includeOrg: boolean; includeBatch: boolean } =
    req.query as unknown as StudentQueryParams;
  const student = await findStudentById({
    findValue: req.params.studentId,
    includeRole,
    includeOrg,
    includeBatch,
    securityFilters: req.body.securityFilters
  });
  if (!student) {
    next(new ApiError(httpStatus.NOT_FOUND, 'Student not found'));
  }
  res.send(student);
});

export const updateStudent = catchAsync(async (req, res, next) => {
  const {
    email,
    name,
    contactPhoneNumber,
    organization,
    isActive,
    sendEmail,
    joiningDate,
    givenStudentId,
    personalEmail,
    dateOfBirth,
    apsche,
    gender,
    batchId
  }: {
    email: string;
    name: string;
    contactPhoneNumber: ContactPhoneNumber;
    organization: string;
    isActive: boolean;
    sendEmail: boolean;
    joiningDate: string;
    givenStudentId: string;
    personalEmail: string;
    dateOfBirth: Date;
    apsche: boolean;
    gender: string;
    batchId: string;
  } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      const studentId = req.params.studentId;
      let retObj = {};
      const { loginId, email: currentEmail } = await findStudentById(
        { findValue: studentId, securityFilters: req.body.securityFilters },
        ['loginId', 'email'],
        transactionClient
      );

      if (!loginId) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      if (email) {
        await modifyLoginRecordSafe('loginId', loginId, { email }, transactionClient);
        retObj = { ...retObj, email };
      }

      if (
        [
          name,
          contactPhoneNumber,
          isActive,
          joiningDate,
          givenStudentId,
          organization,
          personalEmail,
          dateOfBirth,
          apsche,
          batchId,
          gender
        ].some((v) => v !== undefined)
      ) {
        const student = await updateStudentById(
          studentId,
          {
            student: {
              name,
              contactPhoneNumber,
              isActive,
              joiningDate,
              givenStudentId,
              apsche,
              gender,
              batchId,
              personalEmail,
              dateOfBirth,
              orgId: organization
            }
          },
          transactionClient
        );
        retObj = { ...retObj, ...student };
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
      next(new ApiError(httpStatus.CONFLICT, 'Student not updated'));
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

export const patchStudentCourseMappings = catchAsync(async function (req, res) {
  const { studentId } = req.params;
  const { coursesToAdd, coursesToRemove } = req.body;

  await db.transaction(async (transactionClient) => {
    try {
      if (coursesToAdd && coursesToAdd.length > 0) {
        await addStudentToCourses({ courseIds: coursesToAdd, studentId }, transactionClient);
      }
      if (coursesToRemove && coursesToRemove.length > 0) {
        await removeStudentFromCourses(studentId, coursesToRemove, transactionClient);
      }
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Failed to update student course mappings');
    }
  });
});

export const getStudentCourseMappings = catchAsync(async function (req, res) {
  const { studentId } = req.params;
  await db.transaction(async (transactionClient) => {
    try {
      const courses = await findCoursesForStudent(studentId);
      res.send(courses);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Failed to get student course mappings');
    }
  });
});

export const patchStudentProgramMappings = catchAsync(async function (req, res) {
  const { studentId } = req.params;
  const { programsToAdd, programsToRemove } = req.body;

  await db.transaction(async (transactionClient) => {
    try {
      if (programsToAdd && programsToAdd.length > 0) {
        await addStudentToPrograms({ programIds: programsToAdd, studentId }, transactionClient);
      }
      if (programsToRemove && programsToRemove.length > 0) {
        await removeStudentFromPrograms(studentId, programsToRemove, transactionClient);
      }
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Failed to update student program mappings');
    }
  });
});

export const getStudentProgramMappings = catchAsync(async function (req, res) {
  const { studentId } = req.params;
  await db.transaction(async (transactionClient) => {
    try {
      const programs = await findProgramsForStudent(studentId);
      res.send(programs);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Failed to get student program mappings');
    }
  });
});

export const patchStudentProfile = catchAsync(async (req, res, next) => {
  const studentId = req.params.studentId;
  const updateData = req.body;
  if (req.accountInfo?.accountType === 'student' && req.accountInfo.student?.id !== studentId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not allowed to update this profile');
  }

  await db.transaction(async (transactionClient) => {
    try {
      const updatedStudent = await updateStudentById(
        studentId,
        { student: updateData },
        transactionClient
      );

      res.status(httpStatus.OK).send(updatedStudent);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.CONFLICT, 'Student profile not updated'));
    }
  });
});

export const patchStudentProfilePicture = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  await db.transaction(async (transactionClient) => {
    try {
      if (!req.file) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Profile picture is required');
      }

      const storageAccountName = getPublicContainerStorageAccountName();
      if (!storageAccountName) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Storage account name not found');
      }
      const fileMetadata = await uploadFileToBlobStorage({
        file: {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        blobResolutionParams: {
          containerBaseName: 'studentProfilePictures',
          storageAccountName,
          createIfNotExists: false,
          createionStrategy: 'simple',
          newContainerAccessType: 'container'
        }
      });

      const binaryObjectId = await createBinaryObjectRecord(fileMetadata, transactionClient);
      if (!binaryObjectId) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to create binary object record'
        );
      }
      const updatedStudent = await updateStudentById(
        studentId,
        { student: { profilePicture: binaryObjectId } },
        transactionClient
      );
      res.status(httpStatus.OK).send(updatedStudent);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.CONFLICT, 'Student profile picture not updated'));
    }
  });
});
