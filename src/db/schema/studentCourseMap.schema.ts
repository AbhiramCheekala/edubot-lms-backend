import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { CourseTable } from './course.schema.js';
import { StudentTable } from './student.schema.js';

export const studentCourseMapTable = pgTable(
  'student_course_map',
  {
    studentId: uuid('student_id')
      .references(() => StudentTable.studentId)
      .notNull(),
    courseId: uuid('course_id')
      .references(() => CourseTable.courseId)
      .notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull()
  },
  (table) => {
    return {
      pkStudentCourse: primaryKey({ columns: [table.studentId, table.courseId] })
    };
  }
);

export const studentCourseMapRelations = relations(studentCourseMapTable, ({ many }) => ({
  student: many(StudentTable),
  course: many(CourseTable)
}));

export type studentCourseMapEntry = InferSelectModel<typeof studentCourseMapTable>;
export type studentCourseMapEntryInsert = InferInsertModel<typeof studentCourseMapTable>;
