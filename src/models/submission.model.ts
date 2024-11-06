import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  lte,
  sql,
  SQL
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import { SEARCH_KEYS } from '../constants/SearchTypes.js';
import { db, Schema } from '../db/db.js';
import { AssignmentTable } from '../db/schema/assignment.schema.js';
import { BinaryObjectTable } from '../db/schema/binaryObject.schema.js';
import {
  BuildSelectQueryReturnType,
  FindAllResults,
  FindParamsRSF,
  PaginationParams
} from '../db/schema/commonTypes.js';
import { ContentTable } from '../db/schema/content.schema.js';
import { ContentAndGroupMappingsTable } from '../db/schema/contentAngGroupMappings.schema.js';
import { GradeTable } from '../db/schema/grade.schema.js';
import { StudentTable } from '../db/schema/student.schema.js';
import {
  SubmissionFull,
  SubmissionInsert,
  SubmissionJoined,
  SubmissionSearchColumns,
  SubmissionSortColumns,
  SubmissionTable
} from '../db/schema/submission.schema.js';
// import { UserTable } from '../db/schema/user.schema.js';
import { BlobSASPermissions } from '@azure/storage-blob';
import { addHours } from 'date-fns';
import { BatchTable } from '../db/schema/batch.schema.js';
import { CourseModuleMapperTable } from '../db/schema/courseModuleMapper.schema.js';
import { ModuleAndSectionMappingsTable } from '../db/schema/moduleAndSectionMappings.schema.js';
import { OrgUserMapTable } from '../db/schema/orgUserMap.schema.js';
import { ProgramCourseMapTable } from '../db/schema/programCourseMap.schema.js';
import { UserProgramMapTable } from '../db/schema/userProgramMap.schema.js';
import { DataAccessScopes } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import { getContainerClientByContainerName } from '../utils/helpers/azureStorage.helpers.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import pick from '../utils/pick.js';
import { contentsJsonColumns } from './contentGroup.model.js';
import { SubmissionStatus } from '../db/schema/enums.js';
import { ModuleSectionTable } from '../db/schema/moduleSection.schema.js';
import { ModuleTable } from '../db/schema/module.schema.js';
import { CourseTable } from '../db/schema/course.schema.js';

export type JoinOptions = {
  includeContentGroup?: boolean;
  includeStudent?: boolean;
  includeAssignment?: boolean;
  includeGrade?: boolean;
  includeModule?: boolean;
  includeCourse?: boolean;
};
export const defaultJoinOptions: JoinOptions = {
  includeContentGroup: false,
  includeStudent: false,
  includeAssignment: false,
  includeGrade: false,
  includeModule: false,
  includeCourse: false
};

// function normalizeJoinOptions(
//   joinOptions: JoinOptions,
//   searchParams?: ParsedFilter<AssignmentSearchColumns>[],
//   sortParams?: ParsedSort<AssignmentSortColumns>[]
// ) {
//   if (
//     joinOptions?.includeCourse ||
//     searchParams?.find((param) => param.searchColumn === 'courseName') ||
//     sortParams?.find((param) => param.sortColumn === 'courseName')
//   ) {
//     joinOptions.includeCourse = true;
//     joinOptions.includeModule = true;
//     joinOptions.includeModuleSection = true;
//   }

//   if (
//     joinOptions?.includeProgram ||
//     searchParams?.find((param) => param.searchColumn === 'programName') ||
//     sortParams?.find((param) => param.sortColumn === 'programName')
//   ) {
//     joinOptions.includeProgram = true;
//     joinOptions.includeCourse = true;
//     joinOptions.includeModule = true;
//     joinOptions.includeModuleSection = true;
//   }

//   if (searchParams?.find((param) => param.searchColumn === 'organizationName')) {
//     joinOptions.includeOrganization = true;
//   }

//   if (joinOptions?.includeModule) {
//     joinOptions.includeModuleSection = true;
//   }
// }
function normalizeJoinOptions(
  joinOptions: JoinOptions,
  searchParams?: ParsedFilter<SubmissionSearchColumns>[],
  sortParams?: ParsedSort<SubmissionSortColumns>[]
) {
  if (
    sortParams?.find((param) => param.sortColumn === 'studentName') ||
    searchParams?.find((param) => param.searchColumn === 'studentName') ||
    searchParams?.find((param) => param.searchColumn === 'studentId') ||
    searchParams?.find((param) => param.searchColumn === 'orgId')
  ) {
    joinOptions.includeStudent = true;
  }

  if (
    joinOptions?.includeCourse ||
    searchParams?.find((param) => param.searchColumn === 'courseId') ||
    sortParams?.find((param) => param.sortColumn === 'courseName') ||
    sortParams?.find((param) => param.sortColumn === 'courseId')
  ) {
    joinOptions.includeModule = true;
    joinOptions.includeAssignment = true;
  }

  if (
    joinOptions?.includeModule ||
    searchParams?.find((param) => param.searchColumn === 'moduleId') ||
    sortParams?.find((param) => param.sortColumn === 'moduleName') ||
    sortParams?.find((param) => param.sortColumn === 'moduleId')
  ) {
    joinOptions.includeAssignment = true;
  }

  if (
    sortParams?.find((param) => param.sortColumn === 'assignmentName') ||
    sortParams?.find((param) => param.sortColumn === 'assignmentId')
  ) {
    joinOptions.includeAssignment = true;
  }
}

export function getSubmissionReadSecurityFilters({
  securityFilters,
  transactionClient
}: {
  securityFilters?: ResolvedSecurityFilters;
  transactionClient: NodePgDatabase<Schema>;
}): {
  filters: SQL[];
} {
  const filters: SQL[] = [];
  if (securityFilters?.submissionReadScopes) {
    const { scopes, context } = securityFilters.submissionReadScopes;
    if (
      scopes.includes(DataAccessScopes.organization.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const orgIdSubquery = transactionClient
        .select({ orgId: OrgUserMapTable.orgId })
        .from(OrgUserMapTable)
        .where(eq(OrgUserMapTable.userId, context.userId));

      const studentIdSubquery = transactionClient
        .select({ studentId: StudentTable.studentId })
        .from(StudentTable)
        .where(inArray(StudentTable.orgId, orgIdSubquery));

      filters.push(inArray(SubmissionTable.studentId, studentIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.program.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const assignmentIdSubquery = transactionClient
        .select({ assignmentId: AssignmentTable.assignmentId })
        .from(AssignmentTable)
        .innerJoin(
          ModuleAndSectionMappingsTable,
          eq(AssignmentTable.moduleSectionId, ModuleAndSectionMappingsTable.moduleSectionId)
        )
        .innerJoin(
          CourseModuleMapperTable,
          eq(ModuleAndSectionMappingsTable.moduleId, CourseModuleMapperTable.moduleId)
        )
        .innerJoin(
          ProgramCourseMapTable,
          eq(CourseModuleMapperTable.courseId, ProgramCourseMapTable.courseId)
        )
        .innerJoin(
          UserProgramMapTable,
          eq(ProgramCourseMapTable.programId, UserProgramMapTable.programId)
        )
        .where(eq(UserProgramMapTable.userId, context.userId));
      filters.push(inArray(SubmissionTable.assignmentId, assignmentIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.supervisor.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const studentIdSubquery = transactionClient
        .select({ studentId: StudentTable.studentId })
        .from(StudentTable)
        .leftJoin(BatchTable, eq(BatchTable.batchId, StudentTable.batchId))
        .where(eq(BatchTable.mentorId, context.userId));

      filters.push(inArray(SubmissionTable.studentId, studentIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'student' &&
      context.studentId
    ) {
      filters.push(eq(SubmissionTable.studentId, context.studentId));
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
  joinOptions = defaultJoinOptions
}: {
  transactionClient?: NodePgDatabase<Schema>;
  selectColumns: Record<string, PgColumn | SQL>;
  paginationParams?: PaginationParams;
  searchParams?: ParsedFilter<SubmissionSearchColumns>[];
  sortParams?: ParsedSort<SubmissionSortColumns>[];
  securityFilters?: ResolvedSecurityFilters;
  joinOptions?: JoinOptions;
}): BuildSelectQueryReturnType {
  normalizeJoinOptions(joinOptions, searchParams, sortParams);
  let baseQuery: PgSelect = transactionClient
    .selectDistinct(selectColumns)
    .from(SubmissionTable)
    .$dynamic();
  const filters: SQL[] = [];
  const groupByClauses: PgColumn[] = [];
  const sortOperators: SQL[] = [];

  // JOINS
  // if (joinOptions?.includeContentGroup) {
  //   baseQuery = baseQuery
  //     .leftJoin(
  //       ContentGroupTable,
  //       eq(ContentGroupTable.contentGroupId, SubmissionTable.contentGroup)
  //     )
  //     .leftJoin(
  //       ContentAndGroupMappingsTable,
  //       eq(ContentAndGroupMappingsTable.contentGroupId, ContentGroupTable.contentGroupId)
  //     )
  //     .leftJoin(ContentTable, eq(ContentTable.contentId, ContentAndGroupMappingsTable.contentId))
  //     .leftJoin(
  //       BinaryObjectTable,
  //       eq(ContentTable.binaryObjectRef, BinaryObjectTable.binaryObjectId)
  //     );
  //   groupByClauses.push(SubmissionTable.submissionId, ContentGroupTable.contentGroupId);
  // }

  if (joinOptions?.includeStudent) {
    baseQuery = baseQuery.leftJoin(
      StudentTable,
      eq(StudentTable.studentId, SubmissionTable.studentId)
    );
  }

  if (joinOptions?.includeAssignment) {
    baseQuery = baseQuery
      .leftJoin(AssignmentTable, eq(AssignmentTable.assignmentId, SubmissionTable.assignmentId))
      .leftJoin(
        ModuleSectionTable,
        eq(ModuleSectionTable.moduleSectionId, AssignmentTable.moduleSectionId)
      );
  }

  if (joinOptions?.includeGrade) {
    baseQuery = baseQuery.leftJoin(
      GradeTable,
      eq(GradeTable.submissionId, SubmissionTable.submissionId)
    );
    // .leftJoin(UserTable, eq(UserTable.id, GradeTable.grader));
  }

  if (joinOptions?.includeContentGroup) {
    const contentGroupSubquery = transactionClient
      .select({
        contentGroupId: ContentAndGroupMappingsTable.contentGroupId,
        contents: contentsJsonColumns()
      })
      .from(ContentAndGroupMappingsTable)
      .leftJoin(ContentTable, eq(ContentTable.contentId, ContentAndGroupMappingsTable.contentId))
      .leftJoin(
        BinaryObjectTable,
        eq(ContentTable.binaryObjectRef, BinaryObjectTable.binaryObjectId)
      )
      .groupBy(ContentAndGroupMappingsTable.contentGroupId)
      .as('cgs');

    baseQuery = baseQuery.leftJoin(
      contentGroupSubquery,
      eq(contentGroupSubquery.contentGroupId, SubmissionTable.contentGroup)
    );
  }

  if (joinOptions?.includeModule) {
    baseQuery = baseQuery
      .leftJoin(
        ModuleAndSectionMappingsTable,
        eq(ModuleAndSectionMappingsTable.moduleSectionId, ModuleSectionTable.moduleSectionId)
      )
      .leftJoin(ModuleTable, eq(ModuleTable.moduleId, ModuleAndSectionMappingsTable.moduleId));
  }

  if (joinOptions?.includeCourse) {
    baseQuery = baseQuery
      .leftJoin(CourseModuleMapperTable, eq(CourseModuleMapperTable.moduleId, ModuleTable.moduleId))
      .leftJoin(CourseTable, eq(CourseTable.courseId, CourseModuleMapperTable.courseId));
  }

  // PAGINATION
  if (paginationParams) {
    if (paginationParams.limit) baseQuery = baseQuery.limit(paginationParams.limit);
    if (paginationParams.offset) baseQuery = baseQuery.offset(paginationParams.offset);
  }

  // SORTING
  for (const sortParam of sortParams ?? []) {
    const sortType = sortParam.sortType === 'DESC' ? desc : asc;

    switch (sortParam.sortColumn) {
      case 'studentName':
        sortOperators.push(sortType(StudentTable.name));
        break;
      case 'status':
        sortOperators.push(sortType(SubmissionTable.status));
        break;
      case 'submissionId':
        sortOperators.push(sortType(SubmissionTable.submissionId));
        break;
      case 'assignmentId':
        sortOperators.push(sortType(SubmissionTable.assignmentId));
        break;
      case 'submissionDate':
        sortOperators.push(sortType(SubmissionTable.createdAt));
        break;
      case 'courseName':
        sortOperators.push(sortType(CourseTable.name));
        break;
      case 'moduleName':
        sortOperators.push(sortType(ModuleTable.title));
        break;
      case 'assignmentName':
        sortOperators.push(sortType(ModuleSectionTable.title));
        break;
      case 'courseId':
        sortOperators.push(sortType(CourseTable.courseId));
        break;
      case 'moduleId':
        sortOperators.push(sortType(ModuleTable.moduleId));
        break;
    }
  }

  // SEARCH
  for (const searchParam of searchParams ?? []) {
    switch (searchParam.searchColumn) {
      case 'status':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(eq(SubmissionTable.status, searchParam.searchKey as SubmissionStatus));
          }
        }
        break;
      case 'assignmentId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(eq(SubmissionTable.assignmentId, searchParam.searchKey as string));
          }
        }
        break;
      case 'studentId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(eq(SubmissionTable.studentId, searchParam.searchKey as string));
          }
        }
        break;
      case 'orgId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(eq(StudentTable.orgId, searchParam.searchKey as string));
          }
        }
        break;
      case 'studentName':
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
      case 'courseId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(eq(CourseTable.courseId, searchParam.searchKey as string));
          }
        }
        break;
      case 'moduleId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(eq(ModuleTable.moduleId, searchParam.searchKey as string));
          }
        }
        break;
      case 'submissionDateRange':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.DATE_RANGE) {
            filters.push(
              gte(
                SubmissionTable.createdAt,
                (searchParam.searchKey as [Date, Date])[0].toISOString()
              ),
              lte(
                SubmissionTable.createdAt,
                (searchParam.searchKey as [Date, Date])[1].toISOString()
              )
            );
          }
        }
        break;
    }
  }

  const { filters: securityFiltersSQL } = getSubmissionReadSecurityFilters({
    securityFilters,
    transactionClient
  });
  filters.push(...securityFiltersSQL);

  return { queryWithoutWhere: baseQuery, filters, sortOperators, groupByClauses };
}

export async function insertSubmission(
  submission: SubmissionInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SubmissionFull> {
  const [newSubmission] = await transactionClient
    .insert(SubmissionTable)
    .values({ ...submission, updatedAt: new Date().toISOString() })
    .returning(getSanatizedColumns());
  return newSubmission as SubmissionFull;
}

export async function querySubmissionByField(
  field: Extract<keyof SubmissionFull, 'submissionId' | 'assignmentId'>,
  value: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  selectColumns?: Record<string, PgColumn | SQL>
): Promise<SubmissionJoined> {
  normalizeJoinOptions(joinOptions);
  const {
    queryWithoutWhere: baseQuery,
    filters,
    sortOperators,
    groupByClauses
  } = buildSelectQuery({
    transactionClient,
    selectColumns: getSanatizedColumns(selectColumns, joinOptions),
    joinOptions
  });
  filters.push(eq(SubmissionTable[field], value));

  const finalSubmissionQuery = baseQuery
    .where(and(...filters))
    .groupBy(() => [...(groupByClauses ?? [])])
    .orderBy(() => [...(sortOperators ?? [])])
    .limit(1);

  const [submission] = await finalSubmissionQuery;
  if (joinOptions.includeContentGroup) {
    for (const content of submission.contents ?? []) {
      if (
        content.type === 'file' &&
        content.binaryObjectRef &&
        content.binaryObject.containerName
      ) {
        const { containerClient } = await getContainerClientByContainerName(
          content.binaryObject.containerName,
          content.binaryObject.storageAccountName
        );
        const blockBlobClient = containerClient.getBlockBlobClient(content.binaryObject.blobName);
        const sasToken = await blockBlobClient.generateSasUrl({
          permissions: BlobSASPermissions.parse('r'),
          expiresOn: addHours(new Date(), 2)
        });
        content.securedFileUrl = sasToken;
      }
    }
  }
  return submission as SubmissionJoined;
}

export async function queryAllSubmissions({
  transactionClient = db,
  findParams,
  joinOptions = defaultJoinOptions
}: {
  transactionClient?: NodePgDatabase<Schema>;
  findParams: FindParamsRSF<SubmissionSortColumns, SubmissionSearchColumns>;
  joinOptions?: JoinOptions;
}): Promise<FindAllResults<SubmissionJoined>> {
  const { paginationParams, searchParams, sortParams, securityFilters, selectColumns } = findParams;
  normalizeJoinOptions(joinOptions, searchParams, sortParams);
  const sanatizedSelectColumns = getSanatizedColumns(selectColumns, joinOptions);
  const {
    queryWithoutWhere: baseQuery,
    filters,
    sortOperators,
    groupByClauses
  } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    paginationParams: paginationParams?.limit
      ? { ...paginationParams, limit: paginationParams?.limit + 1 }
      : undefined,
    searchParams,
    sortParams,
    securityFilters,
    joinOptions
  });

  const submissions: SubmissionJoined[] = await baseQuery
    .where(and(...filters))
    .groupBy(() => [...(groupByClauses ?? [])])
    .orderBy(() => [...(sortOperators ?? [])]);

  if (joinOptions.includeContentGroup) {
    for (const submission of (submissions ?? []) as any[]) {
      for (const content of submission.contents ?? []) {
        if (
          content.type === 'file' &&
          content.binaryObjectRef &&
          content.binaryObject.containerName
        ) {
          const { containerClient } = await getContainerClientByContainerName(
            content.binaryObject.containerName,
            content.binaryObject.storageAccountName
          );
          const blockBlobClient = containerClient.getBlockBlobClient(content.binaryObject.blobName);
          const sasToken = await blockBlobClient.generateSasUrl({
            permissions: BlobSASPermissions.parse('r'),
            expiresOn: addHours(new Date(), 2)
          });
          content.securedFileUrl = sasToken;
        }
      }
    }
  }

  return {
    results: submissions.slice(0, paginationParams?.limit),
    hasMore: submissions.length > (paginationParams?.limit || 0)
  };
}

export async function updateSubmission(
  submissionId: string,
  updateData: Partial<Pick<SubmissionInsert, 'testCaseResults' | 'autoAnalysisResults' | 'status'>>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SubmissionFull> {
  const [updatedSubmission] = await transactionClient
    .update(SubmissionTable)
    .set({ ...updateData, updatedAt: new Date().toISOString() })
    .where(eq(SubmissionTable.submissionId, submissionId))
    .returning(getSanatizedColumns());
  return updatedSubmission as SubmissionFull;
}

function getSanatizedColumns(
  selectColumns?: Record<string, PgColumn | SQL>,
  joinOptions: JoinOptions = defaultJoinOptions
): Record<string, PgColumn | SQL> {
  normalizeJoinOptions(joinOptions);
  if (selectColumns) {
    // TODO: verify columns are correct
    return selectColumns;
  }
  const submissionCols = pick(getTableColumns(SubmissionTable), [
    'submissionId',
    'createdAt',
    'updatedAt',
    'assignmentId',
    'studentId',
    'status',
    'contentGroup',
    'testCaseResults',
    'autoAnalysisResults'
  ]);

  if (joinOptions.includeContentGroup) {
    submissionCols.contents = sql`cgs.contents`;
  }

  if (joinOptions.includeStudent) {
    submissionCols.studentName = StudentTable.name;
    submissionCols.givenStudentId = StudentTable.givenStudentId;
  }

  if (joinOptions.includeGrade) {
    submissionCols.gradeId = GradeTable.gradeId;
    submissionCols.grade = GradeTable.score;
    submissionCols.feedback = GradeTable.feedback;
    // submissionCols.grader = UserTable.name
    //   .getSQL()
    //   .mapWith(UserTable.name.mapFromDriverValue)
    //   .as('graderName');
  }

  if (joinOptions.includeAssignment) {
    submissionCols.assignmentName = ModuleSectionTable.title;
  }

  if (joinOptions.includeModule) {
    submissionCols.moduleId = ModuleTable.moduleId;
    submissionCols.moduleName = ModuleTable.title;
  }

  if (joinOptions.includeCourse) {
    submissionCols.courseId = CourseTable.courseId;
    submissionCols.courseName = CourseTable.name;
  }

  return submissionCols as Record<string, PgColumn | SQL>;
}
