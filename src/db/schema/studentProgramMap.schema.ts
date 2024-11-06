import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { ProgramTable } from './program.schema.js';
import { StudentTable } from './student.schema.js';

export const stduentProgramMapTable = pgTable(
  'student_program_map',
  {
    studentId: uuid('student_id')
      .references(() => StudentTable.studentId)
      .notNull(),
    programId: uuid('program_id')
      .references(() => ProgramTable.programId)
      .notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull()
  },
  (table) => {
    return {
      pkStudentProgram: primaryKey({ columns: [table.studentId, table.programId] })
    };
  }
);

export const studentProgramMapRelations = relations(stduentProgramMapTable, ({ many }) => ({
  student: many(StudentTable),
  program: many(ProgramTable)
}));

export type studentProgramMapEntry = InferSelectModel<typeof stduentProgramMapTable>;
export type studentProgramMapEntryInsert = InferInsertModel<typeof stduentProgramMapTable>;
