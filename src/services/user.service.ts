import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
// import httpStatus from 'http-status';
// import { QueryResult } from 'pg';
import { db, Schema } from '../db/db.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import {
  OrganizationTable,
  OrgKey,
  RoleKey,
  RoleTable,
  User,
  UserInsert,
  UserJoinedPartial,
  UserKey,
  UserKeyFull,
  UserPartial,
  UserSearchColumn,
  UserSortColumn,
  UserTable
} from '../db/schema/index.js';
import {
  deleteUser,
  findAllUsers,
  findAllUsersWithOrgAndRole,
  findUserByField,
  findUserByFieldWithOrgAndRole,
  insertUser,
  updateUser,
  UserRoleOrg
} from '../models/user.model.js';
// import { encryptPassword, generateRandomPassword } from '../utils/encryption.js';
import { LoginKey, LoginTable } from '../db/schema/login.schema.js';
import { insertOrgUserMapping, updateOrgUserMapping } from '../models/orgUserMap.model.js';
import {
  deleteAllProgramMappingsForUser,
  deleteUserProgramMapping,
  getUserProgramMappings,
  insertUserProgramMapping
} from '../models/userProgramMap.model.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { UserProgramMapEntry } from '../db/schema/userProgramMap.schema.js';

const createUser = async (
  transactionClient: NodePgDatabase<Schema> = db,
  {
    user
  }: {
    user: Omit<UserInsert, 'password' | 'updatedAt'>;
  }
): Promise<User> => {
  // const existingUser = await getUserByEmail(email);
  // if (existingUser?.length) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  // }
  // TODO handle key constraint errors?
  // const password = generateRandomPassword();
  // TODO need login account first
  return await insertUser(transactionClient, {
    ...user,
    // password: await encryptPassword(password),
    updatedAt: new Date().toISOString()
  });
};

const queryUsers = async (
  options: {
    limit?: number;
    page?: number;
    searchParams?: ParsedFilter<UserSearchColumn>[];
    sortParams?: ParsedSort<UserSortColumn>[];
    securityFilters?: ResolvedSecurityFilters;
  },
  keys?: Array<UserKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<FindAllResults<UserPartial>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;
  const paginationParams = { limit, offset };
  const sortParams = options.sortParams;
  const searchParams = options.searchParams;
  const usersRes = await findAllUsers({
    transactionClient,
    findParams: {
      searchParams,
      paginationParams,
      sortParams,
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<UserKey, PgColumn>, key) => {
          acc[key] = UserTable[key];
          return acc;
        },
        {} as Record<UserKey, PgColumn>
      )
    }
  });
  return usersRes;
};

const queryUsersWithRolesAndOrgs = async (
  options: {
    limit?: number;
    page?: number;
    searchParams?: ParsedFilter<UserSearchColumn>[];
    sortParams?: ParsedSort<UserSortColumn>[];
    securityFilters?: ResolvedSecurityFilters;
  },
  keys?: Array<UserKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<FindAllResults<UserRoleOrg>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;
  const paginationParams = { limit, offset };

  const sortParams = options.sortParams;
  const searchParams = options.searchParams;

  const usersRes = await findAllUsersWithOrgAndRole({
    transactionClient,
    findParams: {
      searchParams,
      paginationParams,
      sortParams,
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<UserKey, PgColumn>, key) => {
          acc[key] = UserTable[key];
          return acc;
        },
        {} as Record<UserKey, PgColumn>
      )
    }
  });

  return usersRes;
};

const getUserById = async (
  options: {
    securityFilters?: ResolvedSecurityFilters;
    findValue: User['id'];
  },
  keys?: Array<UserKeyFull>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<UserJoinedPartial & { programMappings: UserProgramMapEntry[] }> => {
  const findValue = options.findValue;
  const selectColumns = keys ? paresSelectKeys(keys) : undefined;

  const user = await findUserByField({
    transactionClient,
    findParams: {
      findValue,
      findColumn: 'id',
      securityFilters: options.securityFilters,
      selectColumns
    }
  });

  const programMappings = await getUserProgramMappings(findValue, transactionClient);
  return { ...user, programMappings };
};

const getUserByIdWithRolesAndOrgs = async (
  options: {
    securityFilters?: ResolvedSecurityFilters;
    findValue: User['id'];
    includeRole: boolean;
    includeOrg: boolean;
    includePrograms: boolean;
  },
  keys?: Array<UserKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<UserPartial & { programMappings: UserProgramMapEntry[] }> => {
  const findValue = options.findValue;

  const user = await findUserByFieldWithOrgAndRole({
    transactionClient,
    findParams: {
      findValue,
      findColumn: 'id',
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<UserKey, PgColumn>, key) => {
          acc[key] = UserTable[key];
          return acc;
        },
        {} as Record<UserKey, PgColumn>
      )
    },
    joinOptions: {
      includeRole: options.includeRole,
      includeOrg: options.includeOrg,
      includePrograms: options.includePrograms
    }
  });

  const programMappings = await getUserProgramMappings(findValue, transactionClient);
  return { ...user, programMappings };
};

const getUserByEmail = async (
  options: {
    securityFilters?: ResolvedSecurityFilters;
    findValue: User['id'];
  },
  keys?: Array<UserKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<UserPartial> => {
  const findValue = options.findValue;

  const user = await findUserByField({
    transactionClient,
    findParams: {
      findValue,
      findColumn: 'email',
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<UserKey, PgColumn>, key) => {
          acc[key] = UserTable[key];
          return acc;
        },
        {} as Record<UserKey, PgColumn>
      )
    }
  });
  return user as UserPartial;
};

const updateUserById = async (
  userId: string,
  transactionClient: NodePgDatabase<Schema> = db,
  {
    user
  }: {
    user: Partial<Omit<UserInsert, 'password' | 'updatedAt'>>;
  }
): Promise<User> => {
  // const user = await getUserById(userId, ['id', 'email', 'name']);
  // if (!user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  // }
  // if (updateBody.email && (await getUserByEmail(updateBody.email as string))) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  // }
  // TODO check if token has access to the user
  const updatedUser = updateUser(userId, transactionClient, user);
  return updatedUser;
};

const deleteUserById = async (userId: string): Promise<User> => {
  // const user = await getUserById(userId);
  // if (!user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  // }
  const deletedUser = deleteUser(userId);
  return deletedUser;
};

const addUserToOrganization = async (
  transactionClient: NodePgDatabase<Schema> = db,
  params: { userId: string; orgId: string }
): Promise<void> => {
  const orgUserMap = await insertOrgUserMapping(transactionClient, params);
  return orgUserMap;
};

const updateUserOrganization = async (
  transactionClient: NodePgDatabase<Schema> = db,
  params: { userId: string; orgId: string }
): Promise<void> => {
  const orgUserMap = await updateOrgUserMapping(transactionClient, params);
  return orgUserMap;
};

//to add a student to multiple  programs
export async function addUserToPrograms(
  params: { userId: string; programIds: string[] },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const programId of params.programIds) {
    await insertUserProgramMapping({ userId: params.userId, programId }, transactionClient);
  }
}

// Remove multiple program mappings for a user
export async function removeUserFromPrograms(
  userId: string,
  programIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const programId of programIds) {
    await deleteUserProgramMapping({ userId, programId }, transactionClient);
  }
}

export async function updateProgramMappingsForUser(
  userId: string,
  programIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await deleteAllProgramMappingsForUser(userId, transactionClient);
  for (const programId of programIds) {
    await insertUserProgramMapping({ userId, programId }, transactionClient);
  }
}

function paresSelectKeys(keys: Array<UserKeyFull>): Record<UserKeyFull, PgColumn> {
  return keys?.reduce(
    (acc: Record<UserKeyFull, PgColumn>, key) => {
      if (
        ['name', 'userId', 'givenUserId', 'isActive', 'contactPhoneNumber', 'loginId'].includes(key)
      ) {
        acc[key] = UserTable[key as UserKey];
      } else if (['email', 'loginId', 'accountType', 'role'].includes(key)) {
        acc[key] = LoginTable[key as LoginKey];
      } else if (['orgName', 'givenOrgId'].includes(key)) {
        acc[key] = OrganizationTable[key as OrgKey];
      } else if (['roleName', 'givenRoleId'].includes(key)) {
        acc[key] = RoleTable[key as RoleKey];
      }
      return acc;
    },
    {} as Record<UserKeyFull, PgColumn>
  );
}

export default {
  createUser,
  queryUsers,
  getUserById,
  getUserByIdWithRolesAndOrgs,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  queryUsersWithRolesAndOrgs,
  addUserToOrganization,
  updateUserOrganization
};
