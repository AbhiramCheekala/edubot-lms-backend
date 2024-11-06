import { and, asc, desc, eq, getTableColumns, ilike, inArray, or, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import { SEARCH_KEYS } from '../constants/SearchTypes.js';
import { db, Schema } from '../db/db.js';
import { BatchTable } from '../db/schema/batch.schema.js';
import {
  FindAllResults,
  FindByKeyParamsRSF,
  FindParamsRSF,
  PaginationParams
} from '../db/schema/commonTypes.js';
import {
  OrganizationTable,
  RoleTable,
  stduentProgramMapTable,
  UserTable
} from '../db/schema/index.js';
import { LoginTable } from '../db/schema/login.schema.js';
import { OrgUserMapTable } from '../db/schema/orgUserMap.schema.js';
import {
  StudentInsert,
  StudentKey,
  StudentPartial,
  StudentSearchColumn,
  StudentSortColumn,
  StudentTable
} from '../db/schema/student.schema.js';
import { UserProgramMapTable } from '../db/schema/userProgramMap.schema.js';
import { DataAccessScopes } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import exclude from '../utils/exclude.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';

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
  if (securityFilters?.studentReadScopes) {
    const { scopes, context } = securityFilters.studentReadScopes;
    if (
      scopes.includes(DataAccessScopes.organization.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const orgIdSubquery = transactionClient
        .select({ orgId: OrgUserMapTable.orgId })
        .from(OrgUserMapTable)
        .where(eq(OrgUserMapTable.userId, context.userId));

      filters.push(inArray(StudentTable.orgId, orgIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.program.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const studentIdSubquery = transactionClient
        .select({ studentId: stduentProgramMapTable.studentId })
        .from(stduentProgramMapTable)
        .innerJoin(
          UserProgramMapTable,
          eq(stduentProgramMapTable.programId, UserProgramMapTable.programId)
        )
        .where(eq(UserProgramMapTable.userId, context.userId));
      filters.push(inArray(StudentTable.studentId, studentIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.supervisor.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      filters.push(eq(BatchTable.mentorId, context.userId));
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'student' &&
      context.studentId
    ) {
      const studentBatchIdSubquery = transactionClient
        .select({ studentId: StudentTable.batchId })
        .from(StudentTable)
        .where(eq(StudentTable.studentId, context.studentId));
      filters.push(
        or(
          eq(StudentTable.studentId, context.studentId),
          inArray(StudentTable.batchId, studentBatchIdSubquery)
        )!
      );
    }
  }
  return { filters };
}
function buildSelectQuery({
  transactionClient = db,
  selectColumns,
  joinRoleTable = false,
  joinOrgTable = false,
  joinBatchesTable = false,
  joinMentorTable = false,
  paginationParams,
  searchParams,
  sortParams,
  securityFilters
}: {
  transactionClient?: NodePgDatabase<Schema>;
  selectColumns: Record<string, PgColumn>;
  joinRoleTable?: boolean;
  joinOrgTable?: boolean;
  joinBatchesTable?: boolean;
  joinMentorTable?: boolean;
  paginationParams?: PaginationParams;
  searchParams?: ParsedFilter<StudentSearchColumn>[];
  sortParams?: ParsedSort<StudentSortColumn>[];
  securityFilters?: ResolvedSecurityFilters;
}): { queryWithoutWhere: PgSelect; filters: SQL[] } {
  let baseQuery = transactionClient
    .select(selectColumns)
    .from(StudentTable)
    .leftJoin(LoginTable, eq(StudentTable.loginId, LoginTable.loginId))
    .$dynamic();
  const filters: SQL[] = [];

  // JOINS
  if (joinRoleTable) {
    baseQuery = baseQuery.leftJoin(RoleTable, eq(LoginTable.role, RoleTable.id));
  }

  if (joinOrgTable) {
    baseQuery = baseQuery.leftJoin(OrganizationTable, eq(StudentTable.orgId, OrganizationTable.id));
  }

  if (joinBatchesTable) {
    baseQuery = baseQuery.leftJoin(BatchTable, eq(StudentTable.batchId, BatchTable.batchId));
  }

  if (joinMentorTable && joinBatchesTable) {
    baseQuery = baseQuery.leftJoin(UserTable, eq(BatchTable.mentorId, UserTable.id));
  }

  // PAGINATION
  if (paginationParams) {
    if (paginationParams.limit) baseQuery = baseQuery.limit(paginationParams.limit);
    if (paginationParams.offset) baseQuery = baseQuery.offset(paginationParams.offset);
  }

  // SORTING
  const sortOperators = [];
  for (const sortParam of sortParams ?? []) {
    if (sortParam.sortColumn) {
      const sortType = sortParam.sortType === 'DESC' ? desc : asc;
      switch (sortParam.sortColumn) {
        case 'name':
          sortOperators.push(sortType(StudentTable.name));
          break;
        case 'givenStudentId':
          sortOperators.push(sortType(StudentTable.givenStudentId));
          break;
        case 'orgName':
          sortOperators.push(sortType(StudentTable.name));
          break;
        case 'email':
          sortOperators.push(sortType(StudentTable.personalEmail));
          break;
      }
    }
  }

  // SEARCH
  for (const searchParam of searchParams ?? []) {
    if (searchParam) {
      switch (searchParam.searchColumn) {
        case 'name':
          if (searchParam.searchKey) {
            if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
              filters.push(ilike(StudentTable.name, `%${searchParam.searchKey}%`));
            } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
              filters.push(ilike(StudentTable.name, searchParam.searchKey as string));
            } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
              filters.push(ilike(StudentTable.name, `${searchParam.searchKey}%`));
            }
          }
          break;
        case 'email':
          if (searchParam.searchKey) {
            if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
              filters.push(ilike(LoginTable.email, `%${searchParam.searchKey}%`));
            } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
              filters.push(ilike(LoginTable.email, searchParam.searchKey as string));
            } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
              filters.push(ilike(LoginTable.email, `${searchParam.searchKey}%`));
            }
          }
          break;
        case 'givenStudentId':
          if (searchParam.searchKey) {
            if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
              filters.push(ilike(StudentTable.givenStudentId, `%${searchParam.searchKey}%`));
            } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
              filters.push(ilike(StudentTable.givenStudentId, searchParam.searchKey as string));
            } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
              filters.push(ilike(StudentTable.givenStudentId, `${searchParam.searchKey}%`));
            }
          }
          break;
        case 'orgName':
          if (searchParam.searchKey) {
            if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
              filters.push(ilike(OrganizationTable.name, `%${searchParam.searchKey}%`));
            } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
              filters.push(ilike(OrganizationTable.name, searchParam.searchKey as string));
            } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
              filters.push(ilike(OrganizationTable.name, `${searchParam.searchKey}%`));
            }
          }
          break;
        case 'batchId':
          if (searchParam.searchKey) {
            if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
              filters.push(eq(StudentTable.batchId, searchParam.searchKey as string));
            }
          }
          break;
        case 'isActive':
          if (searchParam.searchKey === true || searchParam.searchKey === false) {
            if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
              filters.push(eq(StudentTable.isActive, searchParam.searchKey as boolean));
            }
          }
          break;
      }
    }
  }

  // SECURITY FILTERS
  const { filters: securityFiltersSQL } = getUserReadSecurityFilters({
    securityFilters,
    transactionClient
  });
  filters.push(...securityFiltersSQL);

  return { queryWithoutWhere: baseQuery, filters };
}

export async function queryAllStudents({
  transactionClient = db,
  findParams,
  includeBatch = false,
  includeOrg = false,
  includeRole = false,
  includeMentor = false
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindParamsRSF<StudentSortColumn, StudentSearchColumn>;
  includeBatch?: boolean;
  includeOrg?: boolean;
  includeRole?: boolean;
  includeMentor?: boolean;
}): Promise<FindAllResults<StudentPartial>> {
  const { paginationParams, searchParams, sortParams, securityFilters, selectColumns } = findParams;
  const sanatizedSelectColumns = getDefaultSanatizedSelectColumnsWithLoginFields(
    selectColumns,
    includeOrg,
    includeRole,
    includeBatch,
    includeMentor
  );
  const joinOrgTable =
    searchParams?.some((param) => param.searchColumn === 'orgName') ||
    sortParams?.some((param) => param.sortColumn === 'orgName') ||
    includeOrg;
  const joinBatchesTable =
    includeBatch ||
    securityFilters?.studentReadScopes?.scopes.includes(DataAccessScopes.supervisor.id);
  const joinRoleTable = includeRole;
  const joinMentorTable = includeMentor;
  const { queryWithoutWhere, filters } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    joinOrgTable,
    joinBatchesTable,
    joinRoleTable,
    joinMentorTable,
    paginationParams: paginationParams?.limit
      ? { ...paginationParams, limit: paginationParams?.limit + 1 }
      : undefined,
    searchParams,
    sortParams,
    securityFilters
  });
  const query = queryWithoutWhere.where(and(...filters));
  const students = await query;
  const returnObj: FindAllResults<StudentPartial> = {
    results: students.slice(0, paginationParams?.limit),
    hasMore: students.length > (paginationParams?.limit || 0)
  };
  return returnObj;
}

export async function queryStudentByField({
  transactionClient = db,
  findParams,
  joinOptions = {
    includeRole: false,
    includeOrg: false,
    includeBatch: false,
    includeMentor: false
  }
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindByKeyParamsRSF<StudentKey | 'email'>;
  joinOptions?: {
    includeRole?: boolean;
    includeOrg?: boolean;
    includeBatch?: boolean;
    includeMentor?: boolean;
  };
}): Promise<StudentPartial | null> {
  const { securityFilters, selectColumns } = findParams;
  const joinOrgTable = joinOptions?.includeOrg;
  const joinBatchesTable =
    joinOptions?.includeBatch ||
    securityFilters?.studentReadScopes?.scopes.includes(DataAccessScopes.supervisor.id);
  const joinRoleTable = joinOptions?.includeRole;
  const joinMentorTable = joinOptions?.includeMentor;
  const sanatizedSelectColumns = getDefaultSanatizedSelectColumnsWithLoginFields(
    selectColumns,
    joinOrgTable,
    joinRoleTable,
    joinBatchesTable,
    joinMentorTable
  );

  const { queryWithoutWhere, filters } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    joinOrgTable,
    joinBatchesTable,
    joinRoleTable,
    joinMentorTable,
    securityFilters
  });
  const findColumn = findParams.findColumn;
  if (['name', 'givenStudentId', 'studentId', 'personalEmail', 'loginId'].includes(findColumn)) {
    filters.push(eq(StudentTable[findColumn as StudentKey], findParams.findValue));
  } else if (findColumn === 'email') {
    filters.push(eq(LoginTable.email, findParams.findValue));
  } else {
    throw new Error('Invalid search column');
  }
  const query = queryWithoutWhere.where(and(...filters)).limit(1);
  const students = await query;
  return students[0] as StudentPartial;
}

export async function insertStudent(
  student: Omit<StudentInsert, 'updatedAt'>,
  transactionClient: NodePgDatabase<Schema>
): Promise<StudentPartial> {
  const [newStudent] = await transactionClient
    .insert(StudentTable)
    .values({ ...student, updatedAt: new Date().toISOString() })
    .returning(getSanatizedSelectColumns());
  return newStudent as StudentPartial;
}

export async function updateStudent(
  id: string,
  student: StudentPartial,
  transactionClient: NodePgDatabase<Schema>
): Promise<StudentPartial> {
  const [updatedStudent] = await transactionClient
    .update(StudentTable)
    .set(student)
    .where(eq(StudentTable.studentId, id))
    .returning(getSanatizedSelectColumns());
  return updatedStudent as StudentPartial;
}

export async function disableStudent(
  id: string,
  transactionClient: NodePgDatabase<Schema>
): Promise<StudentPartial> {
  const [disabledStudent] = await transactionClient
    .update(StudentTable)
    .set({ isActive: false })
    .where(eq(StudentTable.studentId, id))
    .returning(getSanatizedSelectColumns());
  return disabledStudent as StudentPartial;
}

function getSanatizedSelectColumns(
  selectColumns?: Record<string, PgColumn>,
  includeOrg: boolean = false,
  includeRole: boolean = false,
  includeBatch: boolean = false,
  includeMentor: boolean = false
): Record<string, PgColumn> {
  const retCols = selectColumns
    ? exclude(selectColumns, ['passwordHash', 'updatedAt', 'createdAt'])
    : exclude(getTableColumns(StudentTable), ['updatedAt', 'createdAt']);
  return addJoinedTableColumns(retCols, includeOrg, includeRole, includeBatch, includeMentor);
}

function getDefaultSanatizedSelectColumnsWithLoginFields(
  selectColumns?: Record<string, PgColumn>,
  includeOrg: boolean = false,
  includeRole: boolean = false,
  includeBatch: boolean = false,
  includeMentor: boolean = false
): Record<string, PgColumn> {
  const loginColumns = exclude(getTableColumns(LoginTable), [
    'passwordHash',
    'updatedAt',
    'createdAt'
  ]);
  const retCols = selectColumns
    ? exclude(selectColumns, ['passwordHash', 'updatedAt', 'createdAt'])
    : { ...exclude(getTableColumns(StudentTable), ['updatedAt', 'createdAt']), ...loginColumns };

  return addJoinedTableColumns(retCols, includeOrg, includeRole, includeBatch, includeMentor);
}

function addJoinedTableColumns(
  selectColumns: Record<string, PgColumn>,
  includeOrg: boolean = false,
  includeRole: boolean = false,
  includeBatch: boolean = false,
  includeMentor: boolean = false
): Record<string, PgColumn> {
  const retCols = selectColumns;
  if (includeOrg) {
    const orgColumns = exclude(getTableColumns(OrganizationTable), ['updatedAt', 'createdAt']);
    retCols.orgName = orgColumns.name;
    retCols.orgId = orgColumns.id;
    retCols.givenOrgId = orgColumns.givenOrgId;
    retCols.orgIsActive = orgColumns.isActive;
  }

  if (includeRole) {
    const roleColumns = exclude(getTableColumns(RoleTable), []);
    retCols.roleName = roleColumns.roleName;
    retCols.permissionSetName = roleColumns.permissionSetName;
  }

  if (includeBatch) {
    const batchColumns = exclude(getTableColumns(BatchTable), []);
    retCols.batchName = batchColumns.name;
    retCols.batchMentorId = batchColumns.mentorId;
    retCols.batchNumber = batchColumns.batchNumber;
    retCols.semesterId = batchColumns.semesterId;
  }

  if (includeMentor && includeBatch) {
    const mentorColumns = exclude(getTableColumns(UserTable), []);
    retCols.mentorName = mentorColumns.name;
  }

  return retCols;
}
