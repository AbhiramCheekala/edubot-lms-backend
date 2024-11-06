import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import {
  SubmissionFull,
  SubmissionInsert,
  SubmissionJoined,
  SubmissionKey,
  SubmissionSearchColumns,
  SubmissionSortColumns,
  SubmissionTable
} from '../db/schema/submission.schema.js';
import {
  defaultJoinOptions,
  insertSubmission,
  JoinOptions,
  queryAllSubmissions,
  querySubmissionByField,
  updateSubmission
} from '../models/submission.model.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { updateContentGroup } from './contentGroup.service.js';

export async function createSubmission(
  submission: SubmissionInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SubmissionFull> {
  const newSubmission = await insertSubmission(submission, transactionClient);
  return newSubmission as SubmissionFull;
}

export const findSubmissionById = async (
  submissionId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SubmissionJoined> => {
  const submission = await querySubmissionByField(
    'submissionId',
    submissionId,
    joinOptions,
    transactionClient
  );
  return submission;
};

export const findSubmissionByModuleSectionId = async (
  assignmentId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SubmissionJoined> => {
  const submission = await querySubmissionByField(
    'assignmentId',
    assignmentId,
    joinOptions,
    transactionClient
  );
  return submission;
};

export const findAllSubmissions = async (
  options: {
    limit?: number;
    page?: number;
    searchParams?: ParsedFilter<SubmissionSearchColumns>[];
    sortParams?: ParsedSort<SubmissionSortColumns>[];
    includeContentGroup?: boolean;
    includeStudent?: boolean;
    includeAssignment?: boolean;
    includeGrade?: boolean;
    includeModule?: boolean;
    includeCourse?: boolean;
    securityFilters?: ResolvedSecurityFilters;
  },
  transactionClient: NodePgDatabase<Schema> = db,
  keys?: Array<SubmissionKey>
): Promise<FindAllResults<SubmissionJoined>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;
  const paginationParams = { limit, offset };
  const joinOptions = {
    includeContentGroup: options.includeContentGroup ?? false,
    includeStudent: options.includeStudent ?? false,
    includeAssignment: options.includeAssignment ?? false,
    includeGrade: options.includeGrade ?? false,
    includeModule: options.includeModule ?? false,
    includeCourse: options.includeCourse ?? false
  };
  const sortParams = options.sortParams;
  const searchParams = options.searchParams;

  const courses = await queryAllSubmissions({
    transactionClient,
    findParams: {
      searchParams,
      paginationParams,
      sortParams,
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<SubmissionKey, PgColumn>, key) => {
          acc[key] = SubmissionTable[key];
          return acc;
        },
        {} as Record<SubmissionKey, PgColumn>
      )
    },
    joinOptions
  });

  return courses;
};

export const modifySubmission = async (
  submissionId: string,
  updateData: Partial<
    Pick<SubmissionInsert, 'status' | 'testCaseResults' | 'autoAnalysisResults'> & {
      contents: string[];
    }
  >,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SubmissionFull> => {
  const updatedSubmissionData = {
    ...(updateData.status && { status: updateData.status }),
    ...(updateData.testCaseResults && { testCaseResults: updateData.testCaseResults }),
    ...(updateData.autoAnalysisResults && { autoAnalysisResults: updateData.autoAnalysisResults })
  };
  const updatedSubmission = await updateSubmission(
    submissionId,
    updatedSubmissionData,
    transactionClient
  );

  if (updateData.contents) {
    await updateContentGroup(
      updatedSubmission.contentGroup,
      updateData.contents,
      transactionClient
    );
  }

  return updatedSubmission as SubmissionFull;
};
