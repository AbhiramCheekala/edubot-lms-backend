import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { LoginTable } from './login.schema.js';

export const GithubTokenTable = pgTable('github_token', {
  id: text('id').primaryKey().notNull(),
  loginId: uuid('login_id')
    .notNull()
    .references(() => LoginTable.loginId, { onDelete: 'cascade' })
    .unique(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull()
});

export const GithubTokenRelations = relations(GithubTokenTable, ({ one }) => ({
  Login: one(LoginTable, {
    fields: [GithubTokenTable.loginId],
    references: [LoginTable.loginId]
  })
}));

export type GithubTokenFull = InferSelectModel<typeof GithubTokenTable>;
export type GithubTokenInsert = InferInsertModel<typeof GithubTokenTable>;
