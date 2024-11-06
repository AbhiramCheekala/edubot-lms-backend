import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { AssignmentTable } from './assignment.schema.js';
import { ContentGroup, ContentGroupTable } from './contentGroup.schema.js';
import { SubmissionStatus } from './enums.js';
import { Student, StudentTable } from './student.schema.js';
import { Grade } from './grade.schema.js';

export const SubmissionTable = pgTable('submission', {
  submissionId: uuid('submission_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  assignmentId: uuid('assignment_id')
    .notNull()
    .references(() => AssignmentTable.assignmentId),
  studentId: uuid('student_id')
    .notNull()
    .references(() => StudentTable.studentId),
  status: SubmissionStatus('status').notNull(),
  contentGroup: uuid('content_group_id')
    .notNull()
    .references(() => ContentGroupTable.contentGroupId),
  testCaseResults: jsonb('test_case_results').$type<{ log: string }>(),
  autoAnalysisResults: jsonb('auto_analysis_results').$type<{ result: string }>()
});

export type SubmissionFull = InferSelectModel<typeof SubmissionTable>;
export type SubmissionJoined = Partial<SubmissionFull & Student & Grade & ContentGroup>;
export type Submission = Omit<SubmissionFull, 'updatedAt' | 'createdAt'>;
export type SubmissionKey = keyof Submission;
export type SubmissionPartial = Partial<Submission>;
export type SubmissionInsert = Omit<
  InferInsertModel<typeof SubmissionTable>,
  'createdAt' | 'updatedAt'
>;
export type SubmissionSearchColumns =
  | Extract<SubmissionKey, 'assignmentId' | 'studentId' | 'status'>
  | 'studentName'
  | 'orgId'
  | 'courseId'
  | 'moduleId'
  | 'submissionDateRange';
export type SubmissionSortColumns =
  | Extract<SubmissionKey, 'submissionId' | 'assignmentId' | 'studentId' | 'status'>
  | 'studentName'
  | 'courseName'
  | 'moduleName'
  | 'assignmentName'
  | 'courseId'
  | 'moduleId'
  | 'submissionDate';
