import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  InferSelectModel,
  sql,
  SQL
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import { SEARCH_KEYS } from '../constants/SearchTypes.js';
import { db, Schema } from '../db/db.js';
import {
  FindAllResults,
  FindByKeyParamsRSF,
  FindParamsRSF,
  PaginationParams
} from '../db/schema/commonTypes.js';
import { BatchTable, ProgramTable, RoleName, RoleTable, StudentTable } from '../db/schema/index.js';
import { OrganizationName, OrganizationTable } from '../db/schema/organization.schema.js';
import { OrgUserMapTable } from '../db/schema/orgUserMap.schema.js';
import {
  User,
  UserFull,
  UserInsert,
  UserJoinedPartial,
  UserKey,
  UserPartial,
  UserSearchColumn,
  UserSortColumn,
  UserTable
} from '../db/schema/user.schema.js';
import exclude from '../utils/exclude.js';
import pick from '../utils/pick.js';

import { Login, LoginTable } from '../db/schema/login.schema.js';
import { DataAccessScopes } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { UserProgramMapTable } from '../db/schema/userProgramMap.schema.js';

function getUserReadSecurityFilters({
  securityFilters,
  transactionClient
}: {
  securityFilters?: ResolvedSecurityFilters;
  transactionClient: NodePgDatabase<Schema>;
}): {
  filters: SQL[];
} {
  const filters: SQL[] = [];
  if (securityFilters?.userReadScopes) {
    const { scopes, context } = securityFilters.userReadScopes;
    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      filters.push(eq(UserTable.id, context.userId));
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'student' &&
      context.studentId
    ) {
      const studentMentorSubquery = transactionClient
        .select({ mentorId: BatchTable.mentorId })
        .from(BatchTable)
        .innerJoin(StudentTable, eq(StudentTable.batchId, BatchTable.batchId))
        .where(eq(StudentTable.studentId, context.studentId));
      filters.push(eq(UserTable.id, studentMentorSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.organization.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const subquery = transactionClient
        .select({ orgId: OrgUserMapTable.orgId })
        .from(OrgUserMapTable)
        .where(eq(OrgUserMapTable.userId, context.userId));
      filters.push(inArray(OrgUserMapTable.orgId, subquery));
    }
  }
  return { filters };
}

function buildSelectQuery({
  transactionClient = db,
  selectColumns,
  joinRoleTable = false,
  joinOrgTable = false,
  joinOrgUserMapTable = false,
  paginationParams,
  searchParams,
  sortParams,
  securityFilters
}: {
  transactionClient?: NodePgDatabase<Schema>;
  selectColumns: Record<string, PgColumn | SQL>;
  joinRoleTable?: boolean;
  joinOrgTable?: boolean;
  joinOrgUserMapTable?: boolean;
  paginationParams?: PaginationParams;
  searchParams?: ParsedFilter<UserSearchColumn>[];
  sortParams?: ParsedSort<UserSortColumn>[];
  securityFilters?: ResolvedSecurityFilters;
}): { queryWithoutWhere: PgSelect; filters: SQL[]; sortOperators: SQL[] } {
  let baseQuery: PgSelect = transactionClient
    .selectDistinct(selectColumns)
    .from(UserTable)
    .leftJoin(LoginTable, eq(UserTable.loginId, LoginTable.loginId))
    .$dynamic();
  const filters: SQL[] = [];

  // JOINS
  if (joinRoleTable) {
    baseQuery = baseQuery.leftJoin(RoleTable, eq(LoginTable.role, RoleTable.id));
  }

  if (joinOrgUserMapTable) {
    baseQuery = baseQuery.leftJoin(OrgUserMapTable, eq(UserTable.id, OrgUserMapTable.userId));
  }

  if (joinOrgTable) {
    baseQuery = baseQuery.leftJoin(
      OrganizationTable,
      eq(OrgUserMapTable.orgId, OrganizationTable.id)
    );
  }

  // PAGINATION
  if (paginationParams) {
    if (paginationParams.limit) baseQuery = baseQuery.limit(paginationParams.limit);
    if (paginationParams.offset) baseQuery = baseQuery.offset(paginationParams.offset);
  }

  // SORTING
  const sortOperators = [];
  for (const sortParam of sortParams ?? []) {
    const sortType = sortParam.sortType === 'DESC' ? desc : asc;

    switch (sortParam.sortColumn) {
      case 'name':
        sortOperators.push(sortType(UserTable.name));
        break;
      case 'joiningDate':
        sortOperators.push(sortType(UserTable.joiningDate));
        break;
    }
  }

  // SEARCH
  for (const searchParam of searchParams ?? []) {
    switch (searchParam.searchColumn) {
      case 'name':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(UserTable.name, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(UserTable.name, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(UserTable.name, `${searchParam.searchKey}%`));
          }
        }
        break;

      case 'isActive':
        if (searchParam.searchKey === true || searchParam.searchKey === false) {
          filters.push(eq(UserTable.isActive, searchParam.searchKey as boolean));
        }
        break;

      case 'role':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(RoleTable.roleName, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(RoleTable.roleName, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(RoleTable.roleName, `${searchParam.searchKey}%`));
          }
        }
        break;

      case 'givenUserId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(eq(UserTable.givenUserId, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(UserTable.givenUserId, `${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(UserTable.givenUserId, `%${searchParam.searchKey}%`));
          }
        }
        break;

      case 'organization':
        if (searchParam.searchKey) {
          // filters.push(ilike(OrganizationTable.name, searchParam.searchKey));
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(OrganizationTable.name, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(OrganizationTable.name, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(OrganizationTable.name, `${searchParam.searchKey}%`));
          }
        }
        break;
      case 'orgId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(eq(OrgUserMapTable.orgId, searchParam.searchKey as string));
          }
        }
        break;
    }
  }

  const { filters: securityFiltersSQL } = getUserReadSecurityFilters({
    securityFilters,
    transactionClient
  });
  filters.push(...securityFiltersSQL);

  return { queryWithoutWhere: baseQuery, filters, sortOperators };
}

export async function insertUser(
  transactionClient: NodePgDatabase<Schema> = db,
  user: UserInsert
): Promise<User> {
  const [newUser] = await transactionClient
    .insert(UserTable)
    .values({ ...user, updatedAt: new Date().toISOString() })
    .returning(getSanatizedSelectColumns());
  return newUser as User;
}

export async function findUserByField({
  transactionClient,
  findParams
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindByKeyParamsRSF<keyof UserFull | Login['email']>;
}): Promise<UserJoinedPartial> {
  const { securityFilters, selectColumns } = findParams;
  const sanatizedSelectColumns = getDefaultSanatizedSelectColumnsWithLoginFields(selectColumns);
  // const joinOrgUserMapTable = securityFilter?.scope === DataAccessScopes.organization;
  const joinOrgUserMapTable = true;
  const joinRoleTable = !!findParams.selectColumns?.roleName;
  const { queryWithoutWhere, filters } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    joinOrgUserMapTable,
    joinRoleTable,
    securityFilters
  });
  if (findParams.findColumn === 'email') {
    filters.push(eq(LoginTable.email, findParams.findValue));
  } else {
    filters.push(eq(UserTable[findParams.findColumn as UserKey], findParams.findValue));
  }
  const query = queryWithoutWhere.where(and(...filters)).limit(1);
  const users = await query;
  return users[0] as UserJoinedPartial;
}

export async function findAllUsers({
  transactionClient = db,
  findParams
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindParamsRSF<UserSortColumn, UserSearchColumn>;
}): Promise<FindAllResults<UserPartial>> {
  const { paginationParams, searchParams, sortParams, securityFilters, selectColumns } = findParams;
  const sanatizedSelectColumns = getDefaultSanatizedSelectColumnsWithLoginFields(selectColumns);
  const joinRoleTable = searchParams?.some((sp) => sp.searchColumn === 'role');
  // const joinOrgUserMapTable = securityFilter?.scope === DataAccessScopes.organization;
  const joinOrgUserMapTable = true;
  const joinOrgTable = searchParams?.some((sp) => sp.searchColumn === 'organization');
  const { queryWithoutWhere, filters, sortOperators } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    joinRoleTable,
    joinOrgTable,
    joinOrgUserMapTable,
    paginationParams: paginationParams?.limit
      ? { ...paginationParams, limit: paginationParams?.limit + 1 }
      : undefined,
    searchParams,
    sortParams,
    securityFilters
  });
  const query = queryWithoutWhere.where(and(...filters)).orderBy(...sortOperators);
  const users = await query;
  const returnObj: FindAllResults<UserPartial> = {
    results: users.slice(0, paginationParams?.limit),
    hasMore: users.length > (paginationParams?.limit || 0)
  };
  return returnObj;
}

export async function updateUser(
  id: string,
  transactionClient: NodePgDatabase<Schema> = db,
  user: UserPartial
): Promise<User> {
  const [updatedUser] = await transactionClient
    .update(UserTable)
    .set({ ...user, updatedAt: new Date().toISOString() })
    .where(eq(UserTable.id, id))
    .returning(getSanatizedSelectColumns());
  return updatedUser as User;
}

export async function deleteUser(id: string): Promise<User> {
  const [deletedUser] = await db
    .delete(UserTable)
    .where(eq(UserTable.id, id))
    .returning(getSanatizedSelectColumns());
  return deletedUser as User;
}

export async function disableUser(id: string): Promise<User> {
  const [updatedUser] = await db
    .update(UserTable)
    .set({ isActive: false })
    .where(eq(UserTable.id, id))
    .returning(getSanatizedSelectColumns());
  return updatedUser as User;
}

export async function findAllUsersWithOrgAndRole({
  transactionClient = db,
  findParams
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindParamsRSF<UserSortColumn, UserSearchColumn>;
}): Promise<FindAllResults<UserRoleOrg>> {
  const { paginationParams, searchParams, sortParams, securityFilters, selectColumns } = findParams;
  let sanatizedSelectColumns: Record<string, PgColumn | SQL> =
    getDefaultSanatizedSelectColumnsWithLoginFields(selectColumns);
  const roleColumns = pick(getTableColumns(RoleTable), ['roleName']);
  const orgColumns = pick(getTableColumns(OrganizationTable), ['name', 'id']);
  orgColumns.orgName = orgColumns.name;
  delete orgColumns.name;
  orgColumns.orgId = orgColumns.id;
  delete orgColumns.id;
  sanatizedSelectColumns = { ...roleColumns, ...orgColumns, ...sanatizedSelectColumns } as Record<
    string,
    PgColumn
  >;
  const joinRoleTable = true;
  const joinOrgUserMapTable = true;
  const joinOrgTable = true;
  const { queryWithoutWhere, filters, sortOperators } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    joinRoleTable,
    joinOrgTable,
    joinOrgUserMapTable,
    paginationParams: paginationParams?.limit
      ? { ...paginationParams, limit: paginationParams?.limit + 1 }
      : undefined,
    searchParams,
    sortParams,
    securityFilters
  });
  const query = queryWithoutWhere.where(and(...filters)).orderBy(...sortOperators);
  const users = await query;
  const returnObj: FindAllResults<UserRoleOrg> = {
    results: (users as UserRoleOrg[]).slice(0, paginationParams?.limit),
    hasMore: users.length > (paginationParams?.limit || 0)
  };
  return returnObj;
}

export async function findUserByFieldWithOrgAndRole({
  transactionClient,
  findParams,
  joinOptions = {
    includeRole: true,
    includeOrg: true,
    includePrograms: true
  }
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindByKeyParamsRSF<keyof InferSelectModel<typeof UserTable>>;
  joinOptions: {
    includeRole?: boolean;
    includeOrg?: boolean;
    includePrograms?: boolean;
  };
}): Promise<UserPartial | null> {
  const { securityFilters, selectColumns } = findParams;
  let sanatizedSelectColumns = getDefaultSanatizedSelectColumnsWithLoginFields(selectColumns);

  if (joinOptions.includeRole) {
    const roleColumns = pick(getTableColumns(RoleTable), ['roleName']);
    sanatizedSelectColumns = { ...roleColumns, ...sanatizedSelectColumns } as Record<
      string,
      PgColumn
    >;
  }

  if (joinOptions.includeOrg) {
    const orgColumns = pick(getTableColumns(OrganizationTable), ['name', 'id']);
    orgColumns.orgName = orgColumns.name;
    delete orgColumns.name;
    orgColumns.orgId = orgColumns.id;
    delete orgColumns.id;
    sanatizedSelectColumns = { ...orgColumns, ...sanatizedSelectColumns } as Record<
      string,
      PgColumn
    >;
  }

  if (joinOptions.includePrograms) {
    sanatizedSelectColumns.programs = sql`
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', ${ProgramTable.programId},
              'name', ${ProgramTable.name}
            )
            ORDER BY ${ProgramTable.name}
          )
          FROM ${UserProgramMapTable}
          JOIN ${ProgramTable} ON ${ProgramTable.programId} = ${UserProgramMapTable.programId}
          WHERE ${UserProgramMapTable.userId} = ${UserTable.id}
        ),
        '[]'::jsonb
      ) as programs
    `;
  }

  const joinRoleTable = joinOptions.includeRole;
  const joinOrgUserMapTable = joinOptions.includeOrg;
  const joinOrgTable = joinOptions.includeOrg;
  const { queryWithoutWhere, filters } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    joinOrgTable,
    joinOrgUserMapTable,
    joinRoleTable,
    securityFilters
  });
  filters.push(eq(UserTable[findParams.findColumn], findParams.findValue));
  const query = queryWithoutWhere.where(and(...filters)).limit(1);
  const users = await query;
  return users[0] as UserPartial;
}

function getSanatizedSelectColumns(
  selectColumns?: Record<string, PgColumn>
): Record<string, PgColumn> {
  return selectColumns
    ? exclude(selectColumns, ['passwordHash', 'updatedAt', 'createdAt'])
    : exclude(getTableColumns(UserTable), ['updatedAt', 'createdAt']);
}

function getDefaultSanatizedSelectColumnsWithLoginFields(
  selectColumns?: Record<string, PgColumn>
): Record<string, PgColumn | SQL> {
  const loginColumns = exclude(getTableColumns(LoginTable), [
    'passwordHash',
    'updatedAt',
    'createdAt'
  ]);
  return selectColumns
    ? exclude(selectColumns, ['passwordHash', 'updatedAt', 'createdAt'])
    : { ...exclude(getTableColumns(UserTable), ['updatedAt', 'createdAt']), ...loginColumns };
}

export type UserRoleOrg = UserPartial & OrganizationName & RoleName;
