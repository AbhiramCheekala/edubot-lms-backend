import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { SubmissionTable } from './submission.schema.js';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
// import { UserTable } from './user.schema.js';

export const GradeTable = pgTable('grade', {
  gradeId: uuid('grade_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  submissionId: uuid('submission_id')
    .notNull()
    .references(() => SubmissionTable.submissionId)
    .unique(),
  score: integer('score'),
  feedback: jsonb('feedback').$type<{
    messages: { content: string; createdAt: string; updatedAt: string }[];
  }>()
  // grader: uuid('grader_id')
  //   .notNull()
  //   .references(() => UserTable.id)
  // testCaseResults: jsonb('test_case_results').$type<{ log: string }>(),
  // autoAnalysisResults: jsonb('auto_analysis_results').$type<{ result: string }>()
});

export type GradeFull = InferSelectModel<typeof GradeTable>;
export type Grade = Omit<GradeFull, 'updatedAt' | 'createdAt'>;
export type GradeKey = keyof Grade;
export type GradePartial = Partial<Grade>;
export type GradeInsert = Omit<
  InferInsertModel<typeof GradeTable>,
  'gradeId' | 'createdAt' | 'updatedAt'
>;
export type GradeUpsert = {
  submissionId: string;
  score?: number;
  messages?: { content: string }[];
};
