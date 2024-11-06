import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { AssignmentTable } from './assignment.schema.js';
import { LoginTable } from './login.schema.js';

export const GithubTestCaseTokenTable = pgTable(
  'github_test_case_token',
  {
    token: text('token').primaryKey().notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    githubRepoFullName: text('github_repo_full_name').notNull(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => AssignmentTable.assignmentId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    loginId: uuid('login_id')
      .notNull()
      .references(() => LoginTable.loginId, { onDelete: 'cascade', onUpdate: 'cascade' })
  },
  (table) => ({
    assignment_login_id_index: uniqueIndex('assignment_login_id_index').using(
      'btree',
      table.assignmentId,
      table.loginId
    )
  })
);

export const GithubTestCaseTokenRelations = relations(GithubTestCaseTokenTable, ({ one }) => ({
  User: one(LoginTable, {
    fields: [GithubTestCaseTokenTable.loginId],
    references: [LoginTable.loginId]
  })
}));

export type GithubTestCaseToken = InferSelectModel<typeof GithubTestCaseTokenTable>;
export type GithubTestCaseTokenInsert = InferInsertModel<typeof GithubTestCaseTokenTable>;
export type GithubTestCaseTokenPartial = Partial<GithubTestCaseToken>;
