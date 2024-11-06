import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { BinaryObjectTable } from './binaryObject.schema.js';
import { CoursePartial } from './course.schema.js';
export const ProgramTable = pgTable('program', {
  programId: uuid('program_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  givenProgramId: varchar('given_program_id', { length: 50 }).notNull().unique(),
  description: text('description').notNull(),
  skills: text('skills').notNull(),
  duration: integer('duration').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  bannerRef: uuid('banner_ref')
    .references(() => BinaryObjectTable.binaryObjectId)
    .notNull()
});
export type ProgramFull = InferSelectModel<typeof ProgramTable>;
export type ProgramInsert = InferInsertModel<typeof ProgramTable>;
export type Program = Omit<ProgramFull, 'updatedAt'>;
export type ProgramSortColumn = Extract<keyof Program, 'name'>;
export type ProgramSearchColumn =
  | Extract<keyof ProgramFull, 'name' | 'isActive' | 'courseName' | 'givenProgramId'>
  | 'courseName';
export type ProgramPartial = Partial<Program>;
export type ProgramJoined = ProgramFull & {
  courseCount: number;
  courses: CoursePartial[];
};
export type ProgramKey = keyof Program;
