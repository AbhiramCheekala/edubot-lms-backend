import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  SQL
} from 'drizzle-orm';
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
  Course,
  CourseInsert,
  CoursePartial,
  CourseSearchColumn,
  CourseSortColumn,
  CourseTable
} from '../db/schema/course.schema.js';
import { CourseModuleMapperTable } from '../db/schema/courseModuleMapper.schema.js';
import { ModuleTable } from '../db/schema/module.schema.js';
import { OrgUserMapTable } from '../db/schema/orgUserMap.schema.js';
import { ProgramCourseMapTable } from '../db/schema/programCourseMap.schema.js';
import { StudentTable } from '../db/schema/student.schema.js';
import { studentCourseMapTable } from '../db/schema/studentCourseMap.schema.js';
import { stduentProgramMapTable } from '../db/schema/studentProgramMap.schema.js';
import { DataAccessScopes } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import exclude from '../utils/exclude.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { UserProgramMapTable } from '../db/schema/userProgramMap.schema.js';
import { BinaryObjectTable } from '../db/schema/binaryObject.schema.js';

type JoinOptions = {
  includeModuleCount?: boolean;
  includeModules?: boolean;
};
const defaultJoinOptions: JoinOptions = { includeModuleCount: false, includeModules: false };

function getCourseReadSecurityFilters({
  securityFilters,
  transactionClient
}: {
  securityFilters?: ResolvedSecurityFilters;
  transactionClient: NodePgDatabase<Schema>;
}): {
  filters: SQL[];
} {
  const filters: SQL[] = [];
  if (securityFilters?.courseReadScopes) {
    const { scopes, context } = securityFilters.courseReadScopes;
    if (scopes.includes(DataAccessScopes.admin.id)) {
      // No additional filters for admin
      return { filters };
    }

    if (
      scopes.includes(DataAccessScopes.organization.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      // get all orgs for the user
      const orgIdSubquery = transactionClient
        .select({ orgId: OrgUserMapTable.orgId })
        .from(OrgUserMapTable)
        .where(eq(OrgUserMapTable.userId, context.userId));

      // get all courses for the students of the orgs
      const courseIdStudentSubquery = transactionClient
        .select({ courseId: studentCourseMapTable.courseId })
        .from(studentCourseMapTable)
        .innerJoin(StudentTable, eq(StudentTable.studentId, studentCourseMapTable.studentId))
        .where(inArray(StudentTable.orgId, orgIdSubquery));

      // get all courses for the programs that the students of the orgs are enrolled in
      const courseIdProgramStudentSubquery = transactionClient
        .select({ courseId: ProgramCourseMapTable.courseId })
        .from(ProgramCourseMapTable)
        .innerJoin(
          stduentProgramMapTable,
          eq(stduentProgramMapTable.programId, ProgramCourseMapTable.programId)
        )
        .innerJoin(StudentTable, eq(StudentTable.studentId, stduentProgramMapTable.studentId))
        .where(inArray(StudentTable.orgId, orgIdSubquery));

      filters.push(
        or(
          inArray(CourseTable.courseId, courseIdStudentSubquery),
          inArray(CourseTable.courseId, courseIdProgramStudentSubquery)
        )!
      );
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

      const courseIdStudentSubquery = transactionClient
        .select({ courseId: studentCourseMapTable.courseId })
        .from(studentCourseMapTable)
        .where(inArray(studentCourseMapTable.studentId, studentIdSubquery));

      const courseIdProgramStudentSubquery = transactionClient
        .select({ courseId: ProgramCourseMapTable.courseId })
        .from(ProgramCourseMapTable)
        .innerJoin(
          stduentProgramMapTable,
          eq(stduentProgramMapTable.programId, ProgramCourseMapTable.programId)
        )
        .where(inArray(stduentProgramMapTable.studentId, studentIdSubquery));

      filters.push(
        or(
          inArray(CourseTable.courseId, courseIdStudentSubquery),
          inArray(CourseTable.courseId, courseIdProgramStudentSubquery)
        )!
      );
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'student' &&
      context.studentId
    ) {
      const courseIdSubquery = transactionClient
        .select({ courseId: studentCourseMapTable.courseId })
        .from(studentCourseMapTable)
        .where(eq(studentCourseMapTable.studentId, context.studentId));

      const courseIdProgramStudentSubquery = transactionClient
        .select({ courseId: ProgramCourseMapTable.courseId })
        .from(ProgramCourseMapTable)
        .innerJoin(
          stduentProgramMapTable,
          eq(stduentProgramMapTable.programId, ProgramCourseMapTable.programId)
        )
        .where(eq(stduentProgramMapTable.studentId, context.studentId));

      filters.push(
        or(
          inArray(CourseTable.courseId, courseIdSubquery),
          inArray(CourseTable.courseId, courseIdProgramStudentSubquery)
        )!
      );
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const courseIdSubquery = transactionClient
        .select({ courseId: CourseTable.courseId })
        .from(CourseTable)
        .innerJoin(ProgramCourseMapTable, eq(ProgramCourseMapTable.courseId, CourseTable.courseId))
        .innerJoin(
          UserProgramMapTable,
          eq(UserProgramMapTable.programId, ProgramCourseMapTable.programId)
        )
        .where(eq(UserProgramMapTable.userId, context.userId));

      filters.push(inArray(CourseTable.courseId, courseIdSubquery));
    }
  }
  return { filters };
}

function buildSelectQuery({
  transactionClient = db,
  selectColumns,
  paginationParams,
  searchParams,
  sortParams,
  securityFilters,
  joinOptions = defaultJoinOptions,
  onlyDangling = false,
  markDangling = false
}: {
  transactionClient?: NodePgDatabase<Schema>;
  selectColumns: Record<string, PgColumn | SQL>;
  paginationParams?: PaginationParams;
  searchParams?: ParsedFilter<CourseSearchColumn>[];
  sortParams?: ParsedSort<CourseSortColumn>[];
  securityFilters?: ResolvedSecurityFilters;
  joinOptions?: JoinOptions;
  onlyDangling?: boolean;
  markDangling?: boolean;
}): {
  queryWithoutWhere: PgSelect;
  filters: SQL[];
  sortOperators: SQL[];
  groupByClauses: PgColumn[];
} {
  let baseQuery: PgSelect = transactionClient
    .selectDistinct(selectColumns)
    .from(CourseTable)
    .leftJoin(BinaryObjectTable, eq(CourseTable.bannerRef, BinaryObjectTable.binaryObjectId))
    .$dynamic();
  const filters: SQL[] = [];
  const groupByClauses: PgColumn[] = [BinaryObjectTable.blobUrl, CourseTable.courseId];

  // JOINS
  if (joinOptions?.includeModuleCount) {
    baseQuery = baseQuery.leftJoin(
      CourseModuleMapperTable,
      eq(CourseModuleMapperTable.courseId, CourseTable.courseId)
    );
    groupByClauses.push(CourseTable.courseId);

    if (joinOptions.includeModules) {
      baseQuery = baseQuery.leftJoin(
        ModuleTable,
        eq(CourseModuleMapperTable.moduleId, ModuleTable.moduleId)
      );
      // groupByClauses.push(ModuleTable.moduleId);
    }
  }

  if (joinOptions?.includeModules && !joinOptions?.includeModuleCount) {
    baseQuery = baseQuery.leftJoin(
      CourseModuleMapperTable,
      eq(CourseModuleMapperTable.courseId, CourseTable.courseId)
    );
    baseQuery = baseQuery.leftJoin(
      ModuleTable,
      eq(CourseModuleMapperTable.moduleId, ModuleTable.moduleId)
    );
    groupByClauses.push(CourseTable.courseId);
  }

  if (onlyDangling || markDangling) {
    baseQuery = baseQuery.leftJoin(
      ProgramCourseMapTable,
      eq(ProgramCourseMapTable.courseId, CourseTable.courseId)
    );
    if (onlyDangling) filters.push(isNull(ProgramCourseMapTable.programId));
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
        sortOperators.push(sortType(CourseTable.name));
        break;
    }
  }

  // SEARCH
  for (const searchParam of searchParams ?? []) {
    switch (searchParam.searchColumn) {
      case 'name':
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

      case 'givenCourseId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(CourseTable.givenCourseId, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(CourseTable.givenCourseId, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(CourseTable.givenCourseId, `${searchParam.searchKey}%`));
          }
        }
        break;

      case 'isActive':
        if (searchParam.searchKey === true || searchParam.searchKey === false) {
          filters.push(eq(CourseTable.isActive, searchParam.searchKey as boolean));
        }
        break;
    }
  }

  const { filters: securityFiltersSQL } = getCourseReadSecurityFilters({
    securityFilters,
    transactionClient
  });
  filters.push(...securityFiltersSQL);

  return { queryWithoutWhere: baseQuery, filters, sortOperators, groupByClauses };
}

export async function queryAllCourses({
  transactionClient = db,
  findParams,
  joinOptions = defaultJoinOptions,
  onlyDangling,
  markDangling
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindParamsRSF<CourseSortColumn, CourseSearchColumn>;
  joinOptions?: JoinOptions;
  onlyDangling?: boolean;
  markDangling?: boolean;
}): Promise<FindAllResults<CoursePartial>> {
  const { paginationParams, searchParams, sortParams, securityFilters, selectColumns } = findParams;
  const sanatizedSelectColumns = getSanatizedSelectColumns(selectColumns, joinOptions, true);
  if (markDangling) {
    sanatizedSelectColumns.isDangling = sql`BOOL_OR(${ProgramCourseMapTable.programId} IS NULL)`;
  }
  const { queryWithoutWhere, filters, sortOperators, groupByClauses } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    paginationParams: paginationParams?.limit
      ? { ...paginationParams, limit: paginationParams?.limit + 1 }
      : undefined,
    searchParams,
    sortParams,
    securityFilters,
    joinOptions,
    onlyDangling,
    markDangling
  });
  const query = queryWithoutWhere
    .where(and(...filters))
    .orderBy(...sortOperators)
    .groupBy(() => groupByClauses);
  const users = await query;
  const returnObj: FindAllResults<CoursePartial> = {
    results: users.slice(0, paginationParams?.limit),
    hasMore: users.length > (paginationParams?.limit || 0)
  };
  return returnObj;
}

export async function queryCourseByField({
  transactionClient = db,
  findParams,
  joinOptions = defaultJoinOptions
}: {
  transactionClient: NodePgDatabase<Schema>;
  findParams: FindByKeyParamsRSF<keyof Course>;
  joinOptions?: JoinOptions;
}): Promise<CoursePartial | null> {
  const { securityFilters, selectColumns } = findParams;
  const sanatizedSelectColumns = getSanatizedSelectColumns(selectColumns, joinOptions, true);
  const { queryWithoutWhere, filters, groupByClauses } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    securityFilters, // Use securityFilters instead of securityFilter
    joinOptions
  });
  filters.push(eq(CourseTable[findParams.findColumn], findParams.findValue));
  const query = queryWithoutWhere
    .where(and(...filters))
    .limit(1)
    .groupBy(() => groupByClauses);
  const courses = await query;
  return courses[0] || null; // Return null if no course is found
}

export async function insertCourse(
  transactionClient: NodePgDatabase<Schema> = db,
  course: CourseInsert
): Promise<Course> {
  const [newCourse] = await transactionClient
    .insert(CourseTable)
    .values({ ...course, updatedAt: new Date().toISOString() })
    .returning(getSanatizedSelectColumns());
  return newCourse as Course;
}

export async function updateCourse(
  id: string,
  transactionClient: NodePgDatabase<Schema> = db,
  course: CoursePartial
): Promise<Course> {
  const [updatedCourse] = await transactionClient
    .update(CourseTable)
    .set({ ...course, updatedAt: new Date().toISOString() })
    .where(eq(CourseTable.courseId, id))
    .returning(getSanatizedSelectColumns());
  return updatedCourse as Course;
}

function getSanatizedSelectColumns(
  selectColumns?: Record<string, PgColumn | SQL>,
  joinOptions?: JoinOptions,
  includeBannerUrl: boolean = false
): Record<string, PgColumn | SQL> {
  if (selectColumns) {
    // TODO validate selectColumns
    return exclude(selectColumns, ['updatedAt', 'createdAt']);
  }
  const courseColumns: Record<string, PgColumn | SQL> = exclude(getTableColumns(CourseTable), [
    'updatedAt'
  ]);

  if (includeBannerUrl) {
    courseColumns.bannerUrl = BinaryObjectTable.blobUrl;
  }

  if (joinOptions?.includeModuleCount) {
    courseColumns.moduleCount = sql`count(distinct ${CourseModuleMapperTable.moduleId})`;
  }

  if (joinOptions?.includeModules) {
    courseColumns.modules = sql`COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'moduleId', ${ModuleTable.moduleId},
            'name', ${ModuleTable.title},
            'summary', ${ModuleTable.summary},
            'position', ${CourseModuleMapperTable.position}
          )
        ) FILTER (WHERE ${ModuleTable.moduleId} IS NOT NULL),
        '[]'::jsonb
      )`;
  }

  return courseColumns;
}
