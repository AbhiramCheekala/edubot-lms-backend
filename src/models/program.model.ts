import { and, desc, getTableColumns, ilike, SQL, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import {
  Program,
  ProgramInsert,
  ProgramPartial,
  ProgramSearchColumn,
  ProgramSortColumn,
  ProgramTable
} from '../db/schema/program.schema.js';
import exclude from '../utils/exclude.js';

import { asc, eq, inArray } from 'drizzle-orm';
import { PgSelect } from 'drizzle-orm/pg-core';
import { SEARCH_KEYS } from '../constants/SearchTypes.js';
import { BatchTable } from '../db/schema/batch.schema.js';
import {
  FindAllResults,
  FindByKeyParamsRSF,
  FindParamsRSF,
  PaginationParams
} from '../db/schema/commonTypes.js';
import { CourseTable } from '../db/schema/course.schema.js';
import { OrgUserMapTable } from '../db/schema/orgUserMap.schema.js';
import { ProgramCourseMapTable } from '../db/schema/programCourseMap.schema.js';
import { StudentTable } from '../db/schema/student.schema.js';
import { stduentProgramMapTable } from '../db/schema/studentProgramMap.schema.js';
import { DataAccessScopes } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { UserProgramMapTable } from '../db/schema/userProgramMap.schema.js';
import { BinaryObjectTable } from '../db/schema/binaryObject.schema.js';

function getProgramReadSecurityFilters({
  securityFilters,
  transactionClient
}: {
  securityFilters?: ResolvedSecurityFilters;
  transactionClient: NodePgDatabase<Schema>;
}): {
  filters: SQL[];
} {
  const filters: SQL[] = [];
  if (securityFilters?.programReadScopes) {
    const { scopes, context } = securityFilters.programReadScopes;
    if (scopes.includes(DataAccessScopes.admin.id)) {
      // No additional filters for admin
      return { filters };
    }

    if (
      scopes.includes(DataAccessScopes.organization.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const orgIdSubquery = transactionClient
        .select({ orgId: OrgUserMapTable.orgId })
        .from(OrgUserMapTable)
        .where(eq(OrgUserMapTable.userId, context.userId));

      const programIdSubquery = transactionClient
        .select({ programId: stduentProgramMapTable.programId })
        .from(stduentProgramMapTable)
        .innerJoin(StudentTable, eq(StudentTable.studentId, stduentProgramMapTable.studentId))
        .where(inArray(StudentTable.orgId, orgIdSubquery));

      filters.push(inArray(ProgramTable.programId, programIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.supervisor.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const studentIdSubquery = transactionClient
        .select({ studentId: StudentTable.studentId })
        .from(StudentTable)
        .innerJoin(BatchTable, eq(BatchTable.batchId, StudentTable.batchId))
        .where(eq(BatchTable.mentorId, context.userId));

      const programIdSubquery = transactionClient
        .select({ programId: stduentProgramMapTable.programId })
        .from(stduentProgramMapTable)
        .where(inArray(stduentProgramMapTable.studentId, studentIdSubquery));

      filters.push(inArray(ProgramTable.programId, programIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'student' &&
      context.studentId
    ) {
      const programIdSubquery = transactionClient
        .select({ programId: stduentProgramMapTable.programId })
        .from(stduentProgramMapTable)
        .where(eq(stduentProgramMapTable.studentId, context.studentId));

      filters.push(inArray(ProgramTable.programId, programIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const programIdSubquery = transactionClient
        .select({ programId: UserProgramMapTable.programId })
        .from(UserProgramMapTable)
        .where(eq(UserProgramMapTable.userId, context.userId));

      filters.push(inArray(ProgramTable.programId, programIdSubquery));
    }
  }
  return { filters };
}

function buildSelectQuery({
  transactionClient = db,
  selectColumns,
  joinCourseTable = false,
  joinCourseMapTable = false,
  paginationParams,
  searchParams,
  sortParams,
  securityFilters
}: {
  transactionClient?: NodePgDatabase<Schema>;
  selectColumns: Record<string, PgColumn | SQL<number>>;
  joinCourseTable?: boolean;
  joinCourseMapTable?: boolean;
  includeCourseCount?: boolean;
  paginationParams?: PaginationParams;
  searchParams?: ParsedFilter<ProgramSearchColumn>[];
  sortParams?: ParsedSort<ProgramSortColumn>[];
  securityFilters?: ResolvedSecurityFilters;
}): {
  queryWithoutWhere: PgSelect;
  filters: SQL[];
  sortOperators: SQL[];
  groupByClauses: PgColumn[];
} {
  let baseQuery: PgSelect = transactionClient
    .selectDistinct(selectColumns)
    .from(ProgramTable)
    .leftJoin(BinaryObjectTable, eq(ProgramTable.bannerRef, BinaryObjectTable.binaryObjectId))
    .$dynamic();

  const filters: SQL[] = [];
  const groupByClauses: PgColumn[] = [BinaryObjectTable.blobUrl, ProgramTable.programId];
  if (joinCourseMapTable || joinCourseTable) {
    baseQuery = baseQuery.leftJoin(
      ProgramCourseMapTable,
      eq(ProgramTable.programId, ProgramCourseMapTable.programId)
    );
    groupByClauses.push(ProgramTable.programId);
  }

  if (joinCourseTable) {
    baseQuery = baseQuery.leftJoin(
      CourseTable,
      eq(ProgramCourseMapTable.courseId, CourseTable.courseId)
    );
    groupByClauses.push(ProgramTable.programId);
  }

  // Pagination
  if (paginationParams) {
    if (paginationParams.limit) baseQuery = baseQuery.limit(paginationParams.limit);
    if (paginationParams.offset) baseQuery = baseQuery.offset(paginationParams.offset);
  }

  const sortOperators = [];
  for (const sortParam of sortParams ?? []) {
    const sortType = sortParam.sortType === 'DESC' ? desc : asc;

    switch (sortParam.sortColumn) {
      case 'name':
        sortOperators.push(sortType(ProgramTable.name));
        break;
      // Add other sorting options as needed
    }
  }

  // Search
  for (const searchParam of searchParams ?? []) {
    switch (searchParam.searchColumn) {
      case 'name':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(ProgramTable.name, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(ProgramTable.name, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(ProgramTable.name, `${searchParam.searchKey}%`));
          }
        }
        break;
      case 'courseName':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(CourseTable.name, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(CourseTable.name, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(CourseTable.name, `${searchParam.searchKey}%`));
          }
        }
        break;
      case 'isActive':
        if (searchParam.searchKey === true || searchParam.searchKey === false) {
          filters.push(eq(ProgramTable.isActive, searchParam.searchKey as boolean));
        }
        break;
      case 'givenProgramId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(ProgramTable.givenProgramId, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(ProgramTable.givenProgramId, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(ProgramTable.givenProgramId, `${searchParam.searchKey}%`));
          }
        }
        break;
      // Add other search options as needed
    }
  }

  const { filters: securityFiltersSQL } = getProgramReadSecurityFilters({
    securityFilters,
    transactionClient
  });
  filters.push(...securityFiltersSQL);

  return { queryWithoutWhere: baseQuery, filters, sortOperators, groupByClauses };
}

export async function queryAllPrograms({
  transactionClient = db,
  findParams,
  includeCourseCount = false,
  includeCourses = false
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindParamsRSF<ProgramSortColumn, ProgramSearchColumn>;
  includeCourseCount?: boolean;
  includeCourses?: boolean;
}): Promise<FindAllResults<ProgramPartial>> {
  const { paginationParams, searchParams, sortParams, securityFilters, selectColumns } = findParams;

  // Determine if we need to join the CourseTable based on the search parameters and includeCourseCount flag
  const joinCourseTable = includeCourseCount
    ? (searchParams?.some((param) => param.searchColumn === 'courseName') ?? false)
    : false;

  const includeCourseArray = includeCourses;

  const joinCourseMapTable = includeCourseCount || includeCourses;

  const sanitizedSelectColumns = getSantizedSelectColumns(selectColumns, includeCourseCount, true);

  if (includeCourseArray) {
    addCoursesClauseToProgramSelectColumns(sanitizedSelectColumns);
  }

  const { queryWithoutWhere, filters, sortOperators, groupByClauses } = buildSelectQuery({
    transactionClient,
    selectColumns: sanitizedSelectColumns,
    joinCourseTable,
    joinCourseMapTable,
    paginationParams: paginationParams?.limit
      ? { ...paginationParams, limit: paginationParams?.limit + 1 }
      : undefined,
    searchParams,
    sortParams,
    securityFilters
  });

  const query = queryWithoutWhere
    .where(and(...filters))
    .orderBy(...sortOperators)
    .groupBy(...groupByClauses);

  const results = await query;

  const returnObj: FindAllResults<ProgramPartial> = {
    results: results.slice(0, paginationParams?.limit),
    hasMore: results.length > (paginationParams?.limit || 0)
  };

  return returnObj;
}

export async function queryProgramByField({
  transactionClient = db,
  findParams,
  includeCourseCount = false,
  includeCourses = false
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindByKeyParamsRSF<keyof Program>;
  includeCourseCount?: boolean;
  includeCourses?: boolean;
}): Promise<ProgramPartial | null> {
  const { securityFilters, selectColumns, findColumn, findValue } = findParams;

  const sanitizedSelectColumns = getSantizedSelectColumns(selectColumns, includeCourseCount, true);

  const includeCourseArray = includeCourses;
  const joinCourseMapTable = includeCourseCount || includeCourses;

  if (includeCourseArray) {
    addCoursesClauseToProgramSelectColumns(sanitizedSelectColumns);
  }

  const { queryWithoutWhere, filters, groupByClauses } = buildSelectQuery({
    transactionClient,
    selectColumns: sanitizedSelectColumns,
    joinCourseTable: includeCourseCount,
    joinCourseMapTable,
    securityFilters: securityFilters
  });

  filters.push(eq(ProgramTable[findColumn], findValue));

  const query = queryWithoutWhere
    .where(and(...filters))
    .limit(1)
    .groupBy(...groupByClauses);

  const programs = await query;

  return programs[0] || null;
}

export async function insertProgram(
  transactionClient: NodePgDatabase<Schema> = db,
  program: ProgramInsert
): Promise<Program> {
  const [newUser] = await transactionClient
    .insert(ProgramTable)
    .values({ ...program, updatedAt: new Date().toISOString() })
    .returning(getSantizedSelectColumns());
  return newUser as Program;
}

export async function updateProgram(
  id: string,
  transactionClient: NodePgDatabase<Schema> = db,
  program: ProgramPartial
): Promise<Program> {
  const [updatedOrganization] = await transactionClient
    .update(ProgramTable)
    .set({ ...program, updatedAt: new Date().toISOString() })
    .where(eq(ProgramTable.programId, id))
    .returning(getSantizedSelectColumns());
  return updatedOrganization as Program;
}

function getSantizedSelectColumns(
  selectColumns?: Record<string, PgColumn | SQL<number>>,
  includeCourseCount: boolean = false,
  includeBannerUrl: boolean = false
): Record<string, PgColumn | SQL<number>> {
  const retCols: Record<string, PgColumn | SQL<number>> = selectColumns
    ? exclude(selectColumns, ['updatedAt', 'createdAt'])
    : exclude(getTableColumns(ProgramTable), ['updatedAt']);
  return addJoinedTableColumns(retCols, includeCourseCount, includeBannerUrl);
}

function addJoinedTableColumns(
  selectColumns: Record<string, PgColumn | SQL<number>>,
  includeCourseCount: boolean = false,
  includeBannerUrl: boolean = false
): Record<string, PgColumn | SQL<number>> {
  const retCols = selectColumns;
  if (includeCourseCount) {
    retCols.courseCount = sql`count(distinct ${ProgramCourseMapTable.courseId})`;
  }
  if (includeBannerUrl) {
    retCols.bannerUrl = BinaryObjectTable.blobUrl;
  }
  return retCols;
}

function addCoursesClauseToProgramSelectColumns(selectColumns: Record<string, PgColumn | SQL>) {
  selectColumns.courses = sql`
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'courseId', ${CourseTable.courseId},
              'name', ${CourseTable.name},
              'description', ${CourseTable.description},
              'duration', ${CourseTable.duration},
              'createdAt',${CourseTable.createdAt},
              'givenCourseId',${CourseTable.givenCourseId},
              'skills',${CourseTable.skills},
              'isActive',${CourseTable.isActive}
            )
          ORDER BY ${CourseTable.name})
          FROM ${CourseTable}
          INNER JOIN ${ProgramCourseMapTable}
          ON ${CourseTable.courseId} = ${ProgramCourseMapTable.courseId}
          WHERE ${ProgramCourseMapTable.programId} = ${ProgramTable.programId}
        ),
        '[]'
      ) as courses`;
}
