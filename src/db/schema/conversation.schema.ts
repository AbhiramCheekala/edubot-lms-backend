import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { AssignmentTable } from './assignment.schema.js';
import { LoginTable } from './login.schema.js';

export const ConversationTable = pgTable('Conversation', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  model: jsonb('model'),
  loginId: uuid('loginId')
    .notNull()
    .references(() => LoginTable.loginId),
  starred: boolean('starred').default(false).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  type: text('type').default('').notNull(),
  finalName: text('finalName').default('').notNull(),
  assignmentId: uuid('assignmentId')
    .notNull()
    .references(() => AssignmentTable.assignmentId),
  codespaceInfo: jsonb('codespaceInfo'),
  githubRepoUrl: text('github_repo_url'),
  githubRepoFullName: text('github_repo_full_name')
});

export const ConversationRelations = relations(ConversationTable, ({ one }) => ({
  Login: one(LoginTable, {
    fields: [ConversationTable.loginId],
    references: [LoginTable.loginId]
  })
}));

export type ConversationFull = InferSelectModel<typeof ConversationTable>;
export type ConversationInsert = InferInsertModel<typeof ConversationTable>;
