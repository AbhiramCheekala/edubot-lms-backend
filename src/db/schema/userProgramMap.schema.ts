import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { ProgramTable } from './program.schema.js';
import { UserTable } from './user.schema.js';

export const UserProgramMapTable = pgTable(
  'user_program_map',
  {
    programId: uuid('program_id')
      .references(() => ProgramTable.programId)
      .notNull(),
    userId: uuid('user_id')
      .references(() => UserTable.id)
      .notNull()
  },
  (table) => {
    return {
      user_program_map_pk: primaryKey({
        columns: [table.programId, table.userId]
      })
    };
  }
);

export const UserProgramMapRelations = relations(UserProgramMapTable, ({ many }) => ({
  program: many(ProgramTable),
  user: many(UserTable)
}));

export type UserProgramMapEntry = InferSelectModel<typeof UserProgramMapTable>;
export type UserProgramMapEntryInsert = InferInsertModel<typeof UserProgramMapTable>;
