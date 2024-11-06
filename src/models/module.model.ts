import { BlobSASPermissions } from '@azure/storage-blob';
import { addHours } from 'date-fns';
import { and, eq, getTableColumns, inArray, or, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { AssignmentTable } from '../db/schema/assignment.schema.js';
import { BatchTable } from '../db/schema/batch.schema.js';
import { CourseModuleMapperTable } from '../db/schema/courseModuleMapper.schema.js';
import { Module, ModuleFull, ModuleInsert, ModuleTable } from '../db/schema/module.schema.js';
import { ModuleAndSectionMappingsTable } from '../db/schema/moduleAndSectionMappings.schema.js';
import { ModuleSectionTable } from '../db/schema/moduleSection.schema.js';
import { OrgUserMapTable } from '../db/schema/orgUserMap.schema.js';
import { ProgramCourseMapTable } from '../db/schema/programCourseMap.schema.js';
import { StudentTable } from '../db/schema/student.schema.js';
import { studentCourseMapTable } from '../db/schema/studentCourseMap.schema.js';
import { stduentProgramMapTable } from '../db/schema/studentProgramMap.schema.js';
import { DataAccessScopes } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import { getContainerClientByContainerName } from '../utils/helpers/azureStorage.helpers.js';
import pick from '../utils/pick.js';
import { CourseTable } from '../db/schema/course.schema.js';
import { UserProgramMapTable } from '../db/schema/userProgramMap.schema.js';

export type JoinOptions = { includeModuleSections: boolean; includeSectionContents: boolean };
export const defaultJoinOptions: JoinOptions = {
  includeModuleSections: false,
  includeSectionContents: false
};

export async function insertModule(
  module: ModuleInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ModuleFull> {
  const [newModule] = await transactionClient
    .insert(ModuleTable)
    .values({ ...module, updatedAt: new Date().toISOString() })
    .returning(getSanatizedColumns());
  return newModule as ModuleFull;
}

export async function queryModuleByField(
  field: Extract<keyof ModuleFull, 'moduleId'>,
  value: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters,
  selectColumns?: Record<string, PgColumn | SQL>
): Promise<ModuleFull | null> {
  let baseQuery: PgSelect = transactionClient
    .select(getSanatizedColumns(selectColumns, joinOptions))
    .from(ModuleTable)
    .$dynamic();
  const filters: SQL[] = [eq(ModuleTable[field], value)];
  const groupByClauses: PgColumn[] = [];

  if (joinOptions.includeModuleSections && !joinOptions.includeSectionContents) {
    baseQuery = baseQuery
      .leftJoin(
        ModuleAndSectionMappingsTable,
        eq(ModuleAndSectionMappingsTable.moduleId, ModuleTable.moduleId)
      )
      .leftJoin(
        ModuleSectionTable,
        eq(ModuleSectionTable.moduleSectionId, ModuleAndSectionMappingsTable.moduleSectionId)
      )
      .leftJoin(
        AssignmentTable,
        eq(AssignmentTable.moduleSectionId, ModuleSectionTable.moduleSectionId)
      );
    groupByClauses.push(ModuleTable.moduleId);
  }

  const { filters: securityFiltersArray } = getModuleReadSecurityFilters({
    securityFilters,
    transactionClient
  });
  filters.push(...securityFiltersArray);

  const [module] = await baseQuery
    .where(and(...filters))
    .groupBy(() => [...groupByClauses])
    .limit(1);

  if (joinOptions.includeSectionContents) {
    for (const section of (module?.moduleSections ?? []) as any[]) {
      for (const content of section?.contents ?? []) {
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
  return module as ModuleFull | null;
}

export async function queryAllModulesByCourse(
  courseId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters,
  selectColumns?: Record<string, PgColumn | SQL>
): Promise<ModuleFull[]> {
  const sanatizedSelectColumns: Record<string, PgColumn | SQL> = getSanatizedColumns(
    selectColumns,
    joinOptions
  );
  sanatizedSelectColumns.position = CourseModuleMapperTable.position;
  let baseQuery: PgSelect = transactionClient
    .selectDistinct(sanatizedSelectColumns)
    .from(ModuleTable)
    .leftJoin(CourseModuleMapperTable, eq(CourseModuleMapperTable.moduleId, ModuleTable.moduleId))
    .$dynamic();
  const filters: SQL[] = [eq(CourseModuleMapperTable.courseId, courseId)];
  const groupByClauses: PgColumn[] = [];

  if (joinOptions.includeModuleSections && !joinOptions.includeSectionContents) {
    baseQuery = baseQuery
      .leftJoin(
        ModuleAndSectionMappingsTable,
        eq(ModuleAndSectionMappingsTable.moduleId, ModuleTable.moduleId)
      )
      .leftJoin(
        ModuleSectionTable,
        eq(ModuleSectionTable.moduleSectionId, ModuleAndSectionMappingsTable.moduleSectionId)
      )
      .leftJoin(
        AssignmentTable,
        eq(AssignmentTable.moduleSectionId, ModuleSectionTable.moduleSectionId)
      );
    groupByClauses.push(ModuleTable.moduleId);
  }

  // DOING FETCH AT CONTROLL LEVEL FOR COURSE WITH SECURITY FILTERS
  // const { filters: securityFiltersArray } = getModuleReadSecurityFilters({
  //   securityFilters,
  //   transactionClient
  // });
  // filters.push(...securityFiltersArray);

  const modules = await baseQuery.where(and(...filters)).groupBy(() => [...groupByClauses]);

  if (joinOptions.includeSectionContents) {
    for (const module of (modules ?? []) as any[]) {
      for (const section of (module?.moduleSections ?? []) as any[]) {
        for (const content of section?.contents ?? []) {
          if (
            content.type === 'file' &&
            content.binaryObjectRef &&
            content.binaryObject.containerName
          ) {
            const { containerClient } = await getContainerClientByContainerName(
              content.binaryObject.containerName,
              content.binaryObject.storageAccountName
            );
            const blockBlobClient = containerClient.getBlockBlobClient(
              content.binaryObject.blobName
            );
            const sasToken = await blockBlobClient.generateSasUrl({
              permissions: BlobSASPermissions.parse('r'),
              expiresOn: addHours(new Date(), 2)
            });
            content.securedFileUrl = sasToken;
          }
        }
      }
    }
  }
  return modules as ModuleFull[];
}

export async function updateModule(
  moduleId: string,
  updateData: Pick<Module, 'title' | 'summary'>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ModuleFull | null> {
  const [updatedModule] = await transactionClient
    .update(ModuleTable)
    .set({ ...updateData, updatedAt: new Date().toISOString() })
    .where(eq(ModuleTable.moduleId, moduleId))
    .returning(getSanatizedColumns());
  return updatedModule as ModuleFull | null;
}

function getSanatizedColumns(
  selectColumns?: Record<string, PgColumn | SQL>,
  joinOptions: JoinOptions = defaultJoinOptions
): Record<string, PgColumn | SQL> {
  if (selectColumns) {
    // TODO: verify columns are correct
    return selectColumns;
  }
  const moduleColumns: Record<string, PgColumn | SQL> = pick(getTableColumns(ModuleTable), [
    'moduleId',
    'title',
    'summary',
    'createdAt',
    'updatedAt'
  ]) as Record<string, PgColumn | SQL>;

  if (joinOptions.includeModuleSections && !joinOptions.includeSectionContents) {
    // moduleColumns.moduleSections = sql`
    //   ARRAY(
    //     SELECT jsonb_build_object(
    //       'moduleSectionId', ${ModuleSectionTable.moduleSectionId},
    //       'title', ${ModuleSectionTable.title},
    //       'contentGroup', ${ModuleSectionTable.contentGroup}
    //     )
    //     FROM ${ModuleSectionTable}
    //     WHERE ${ModuleSectionTable.moduleId} = ${ModuleTable.moduleId}
    //   )
    // `;
    moduleColumns.moduleSections = sql`
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'moduleSectionId', ${ModuleSectionTable.moduleSectionId},
            'title', ${ModuleSectionTable.title},
            'contentGroup', ${ModuleSectionTable.contentGroup},
            'position', ${ModuleAndSectionMappingsTable.position},
            'sectionType', ${ModuleSectionTable.sectionType},
            'createdAt', ${ModuleSectionTable.createdAt},
            'updatedAt', ${ModuleSectionTable.updatedAt},
            'assignmentInfo', CASE 
              WHEN ${AssignmentTable.assignmentId} IS NOT NULL THEN
                JSONB_BUILD_OBJECT(
                  'assignmentId', ${AssignmentTable.assignmentId},
                  'createdAt', ${AssignmentTable.createdAt},
                  'updatedAt', ${AssignmentTable.updatedAt},
                  'templateRepository', ${AssignmentTable.templateRepository},
                  'platformType', ${AssignmentTable.platformType},
                  'autoGrading', ${AssignmentTable.autoGrading},
                  'testCaseGrading', ${AssignmentTable.testCaseGrading}
                )
              ELSE NULL
            END
          )
          ORDER BY ${ModuleAndSectionMappingsTable.position}
        ),
        '[]'::JSONB
      ) as moduleSections
    `;
  } else if (joinOptions.includeModuleSections && joinOptions.includeSectionContents) {
    moduleColumns.moduleSections = sql`
      COALESCE(
        (SELECT 
          JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'moduleSectionId', subquery.module_section_id,
              'title', subquery.name,
              'contentGroup', subquery.content_group_id,
              'position', subquery.position,
              'sectionType', subquery.section_type,
              'createdAt', subquery.created_at,
              'updatedAt', subquery.updated_at,
              'contents', subquery.contents,
              'assignmentInfo', CASE 
                WHEN subquery.assignment_id IS NOT NULL THEN
                  JSONB_BUILD_OBJECT(
                    'assignmentId', subquery.assignment_id,
                    'createdAt', subquery.assignment_created_at,
                    'updatedAt', subquery.assignment_updated_at,
                    'templateRepository', subquery.assignment_template_repository,
                    'platformType', subquery.assignment_platform_type,
                    'autoGrading', subquery.assignment_auto_grading,
                    'testCaseGrading', subquery.assignment_test_case_grading
                  )
                ELSE NULL
              END
            )
            ORDER BY subquery.position
          )
        FROM (
          SELECT 
            "module_section"."module_section_id" as module_section_id,
            "module_section"."name" as name,
            "module_section"."content_group_id" as content_group_id,
            "module_section_mapper"."position" as position,
            "module_section"."section_type" as section_type,
            "module_section"."created_at" as created_at,
            "module_section"."updated_at" as updated_at,
            "assignment"."assignment_id" as assignment_id,
            "assignment"."created_at" as assignment_created_at,
            "assignment"."updated_at" as assignment_updated_at,
            "assignment"."template_repository" as assignment_template_repository,
            "assignment"."platform_type" as assignment_platform_type,
            "assignment"."auto_grading" as assignment_auto_grading,
            "assignment"."test_case_grading" as assignment_test_case_grading,
            COALESCE(
              JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'contentId', "content"."content_id",
                  'type', "content"."type",
                  'url', "content"."url",
                  'binaryObjectRef', "content"."binary_object_ref",
                  'position', "content_and_group_mappings"."position",
                  'binaryObject', JSONB_BUILD_OBJECT(
                    'mimeType', "binary_object"."mime_type",
                    'originalFileName', "binary_object"."original_file_name",
                    'fileSize', "binary_object"."file_size",
                    'containerName', "binary_object"."container_name",
                    'storageAccountName', "binary_object"."storage_account_name",
                    'blobName', "binary_object"."blob_name",
                    'metadata', "binary_object"."metadata"
                  )
                )
                ORDER BY "content_and_group_mappings"."position"
              ) FILTER (WHERE "content"."content_id" IS NOT NULL),
              '[]'::JSONB
            ) AS contents
          FROM ${ModuleAndSectionMappingsTable}
          LEFT JOIN "module_section" ON "module_section"."module_section_id" = "module_section_mapper"."module_section_id"
          LEFT JOIN "content_group" ON "module_section"."content_group_id" = "content_group"."content_group_id"
          LEFT JOIN "content_and_group_mappings" ON "content_group"."content_group_id" = "content_and_group_mappings"."content_group_id"
          LEFT JOIN "content" ON "content"."content_id" = "content_and_group_mappings"."content_id"
          LEFT JOIN "binary_object" ON "content"."binary_object_ref" = "binary_object"."binary_object_id"
          LEFT JOIN "assignment" ON "assignment"."module_section_id" = "module_section"."module_section_id"
          WHERE "module_section_mapper"."module_id" = "module"."module_id"
          GROUP BY 
            "module_section"."module_section_id",
            "module_section"."name",
            "module_section"."content_group_id",
            "module_section_mapper"."position",
            "assignment"."assignment_id"
        ) AS subquery
        ),
        '[]'::JSONB
      ) AS moduleSections
    `;
  }

  return moduleColumns;
}

function getModuleReadSecurityFilters({
  securityFilters,
  transactionClient
}: {
  securityFilters?: ResolvedSecurityFilters;
  transactionClient: NodePgDatabase<Schema>;
}): {
  filters: SQL[];
} {
  const filters: SQL[] = [];
  if (securityFilters?.moduleReadScopes) {
    const { scopes, context } = securityFilters.moduleReadScopes;

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

      // get all modules for the courses
      const moduleIdSubquery = transactionClient
        .select({ moduleId: CourseModuleMapperTable.moduleId })
        .from(CourseModuleMapperTable)
        .where(
          or(
            inArray(CourseModuleMapperTable.courseId, courseIdStudentSubquery),
            inArray(CourseModuleMapperTable.courseId, courseIdProgramStudentSubquery)
          )
        );

      filters.push(inArray(ModuleTable.moduleId, moduleIdSubquery));
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

      // get all modules for the courses
      const moduleIdSubquery = transactionClient
        .select({ moduleId: CourseModuleMapperTable.moduleId })
        .from(CourseModuleMapperTable)
        .where(
          or(
            inArray(CourseModuleMapperTable.courseId, courseIdStudentSubquery),
            inArray(CourseModuleMapperTable.courseId, courseIdProgramStudentSubquery)
          )
        );

      filters.push(inArray(ModuleTable.moduleId, moduleIdSubquery));
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

      const moduleIdSubquery = transactionClient
        .select({ moduleId: CourseModuleMapperTable.moduleId })
        .from(CourseModuleMapperTable)
        .where(
          or(
            inArray(CourseModuleMapperTable.courseId, courseIdSubquery),
            inArray(CourseModuleMapperTable.courseId, courseIdProgramStudentSubquery)
          )
        );

      filters.push(inArray(ModuleTable.moduleId, moduleIdSubquery));
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

      const moduleIdSubquery = transactionClient
        .select({ moduleId: CourseModuleMapperTable.moduleId })
        .from(CourseModuleMapperTable)
        .where(inArray(CourseModuleMapperTable.courseId, courseIdSubquery));

      filters.push(inArray(ModuleTable.moduleId, moduleIdSubquery));
    }
  }
  return { filters };
}
