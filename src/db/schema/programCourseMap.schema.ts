import { integer, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { ProgramTable } from './program.schema.js';
import { CourseTable } from './course.schema.js';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const ProgramCourseMapTable = pgTable(
  'program_course_map',
  {
    programId: uuid('program_id')
      .references(() => ProgramTable.programId)
      .notNull(),
    courseId: uuid('course_id')
      .references(() => CourseTable.courseId)
      .notNull(),
    position: integer('position').notNull()
  },
  (table) => {
    return {
      program_course_Index_key: uniqueIndex('program_course_map_key').using(
        'btree',
        table.programId,
        table.courseId
      ),
      program_position_Index_key: uniqueIndex('program_position_Index_key').using(
        'btree',
        table.programId,
        table.position
      )
    };
  }
);

export type ProgramCourseMapEntry = InferSelectModel<typeof ProgramCourseMapTable>;
export type ProgramCourseMapEntryInsert = InferInsertModel<typeof ProgramCourseMapTable>;
