import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import {
  AssignmentFull,
  AssignmentInsert,
  AssignmentJoined,
  AssignmentKey,
  AssignmentSearchColumns,
  AssignmentSortColumns,
  AssignmentTable
} from '../db/schema/assignment.schema.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import { User } from '../db/schema/user.schema.js';
import {
  defaultJoinOptions,
  insertAssignment,
  JoinOptions,
  queryAllAssignments,
  queryAssignmentByField,
  updateAssignment
} from '../models/assignment.model.js';
import { DataAccessScope } from '../permissions/DataAccessScopes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';

export async function createAssignment(
  assignment: AssignmentInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<AssignmentFull> {
  const newAssignment = await insertAssignment(assignment, transactionClient);
  return newAssignment as AssignmentFull;
}

export const findAssignmentById = async (
  assignmentId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters
): Promise<AssignmentJoined | null> => {
  const assignment = await queryAssignmentByField(
    'assignmentId',
    assignmentId,
    joinOptions,
    transactionClient,
    securityFilters
  );
  return assignment;
};

export const findAssignmentByModuleSectionId = async (
  moduleSectionId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters
): Promise<AssignmentJoined | null> => {
  const assignment = await queryAssignmentByField(
    'moduleSectionId',
    moduleSectionId,
    joinOptions,
    transactionClient,
    securityFilters
  );
  return assignment;
};

export const findAllAssignments = async (
  options: {
    limit?: number;
    page?: number;
    searchParams?: ParsedFilter<AssignmentSearchColumns>[];
    sortParams?: ParsedSort<AssignmentSortColumns>[];
    coursePermissionScope?: DataAccessScope;
    currentUserRef?: User['id'];
    includeModuleCount?: boolean;
    includeModules?: boolean;
    includeModuleSection?: boolean;
    includeSubmissionCount?: boolean;
    includeModule?: boolean;
    includeCourse?: boolean;
    includeProgram?: boolean;
    includeOrganization?: boolean;
    securityFilters?: ResolvedSecurityFilters;
  },
  transactionClient: NodePgDatabase<Schema> = db,
  keys?: Array<AssignmentKey>
): Promise<FindAllResults<AssignmentJoined>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;
  const paginationParams = { limit, offset };
  const joinOptions = {
    includeModuleSection: options.includeModuleSection ?? false,
    includeSubmissionCount: options.includeSubmissionCount ?? false,
    includeModule: options.includeModule ?? false,
    includeCourse: options.includeCourse ?? false,
    includeProgram: options.includeProgram ?? false,
    includeOrganization: options.includeOrganization ?? false
  };
  const sortParams = options.sortParams;
  const searchParams = options.searchParams;

  const courses = await queryAllAssignments({
    transactionClient,
    findParams: {
      searchParams,
      paginationParams,
      sortParams,
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<AssignmentKey, PgColumn>, key) => {
          acc[key] = AssignmentTable[key];
          return acc;
        },
        {} as Record<AssignmentKey, PgColumn>
      )
    },
    joinOptions
  });

  return courses;
};

export const modifyAssignment = async (
  assignmentId: string,
  updateData: Omit<AssignmentInsert, 'moduleSectionId'>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<AssignmentFull> => {
  const updatedAssignment = await updateAssignment(assignmentId, updateData, transactionClient);
  return updatedAssignment as AssignmentFull;
};
