import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { CourseModuleMapperTable } from './courseModuleMapper.schema.js';
import { BinaryObjectTable } from './binaryObject.schema.js';

export const CourseTable = pgTable('course', {
  courseId: uuid('course_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  givenCourseId: varchar('given_course_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  skills: text('skills').notNull(),
  duration: integer('duration').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  bannerRef: uuid('banner_ref')
    .references(() => BinaryObjectTable.binaryObjectId)
    .notNull()
});

export const CourseRelations = relations(CourseTable, ({ many }) => ({
  courseModuleMapper: many(CourseModuleMapperTable)
}));

export type CourseFull = InferSelectModel<typeof CourseTable>;
export type Course = Omit<CourseFull, 'updatedAt'>;
export type CourseInsert = InferInsertModel<typeof CourseTable>;
export type CourseSortColumn = Extract<keyof Course, 'givenCourseId' | 'name'>;
export type CourseSearchColumn = Extract<keyof CourseFull, 'name' | 'givenCourseId' | 'isActive'>;
export type CoursePartial = Partial<Course>;
export type CourseKey = keyof Course;
