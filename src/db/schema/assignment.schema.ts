import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { PlatformTypeDbEnum } from './enums.js';
import { ModuleSectionFull, ModuleSectionTable } from './moduleSection.schema.js';
import { ProgramFull } from './program.schema.js';
import { CourseFull } from './course.schema.js';
import { ModuleFull } from './module.schema.js';
import { Organization } from './organization.schema.js';

export const AssignmentTable = pgTable('assignment', {
  assignmentId: uuid('assignment_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  templateRepository: text('template_repository').notNull(),
  platformType: PlatformTypeDbEnum('platform_type').notNull(),
  autoGrading: boolean('auto_grading').notNull().default(false),
  testCaseGrading: boolean('test_case_grading').notNull().default(false),
  moduleSectionId: uuid('module_section_id')
    .references(() => ModuleSectionTable.moduleSectionId)
    .notNull()
    .unique()
  // title: varchar('title', { length: 100 }).notNull(),
  // summary: text('summary').notNull(),
  // contentGroupId: uuid('content_group_id').references(() => ContentGroupTable.contentGroupId),
});

//relations
export const AssignmentRelations = relations(AssignmentTable, ({ one }) => ({
  moduleSection: one(ModuleSectionTable, {
    fields: [AssignmentTable.moduleSectionId],
    references: [ModuleSectionTable.moduleSectionId]
  })
}));

export type AssignmentFull = InferSelectModel<typeof AssignmentTable>;
export type AssignmentJoined = Partial<
  AssignmentFull &
    ProgramFull &
    CourseFull &
    ModuleSectionFull &
    ModuleFull &
    Organization & { submissionCount: number }
>;
export type AssignmentInsert = Omit<
  InferInsertModel<typeof AssignmentTable>,
  'updatedAt' | 'createdAt' | 'assignmentId'
>;
export type Assignment = Omit<AssignmentFull, 'updatedAt' | 'createdAt'>;
export type AssignmentKey = keyof Assignment;
export type AssignmentPartial = Partial<Assignment>;
export type AssignmentSearchColumns =
  | Extract<AssignmentKey, 'assignmentId' | 'moduleSectionId'>
  | 'courseName'
  | 'programName'
  | 'organizationId';
export type AssignmentSortColumns =
  | 'courseName'
  | 'programName'
  | 'programId'
  | 'courseId'
  | 'moduleName'
  | 'moduleId'
  | 'moduleSectionTitle';
