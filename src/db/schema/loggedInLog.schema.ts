import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { LoginTable } from './login.schema.js';

export const LoggedInLogTable = pgTable('LoggedInLog', {
  id: text('id').primaryKey().notNull(),
  loginId: uuid('loginId')
    .notNull()
    .references(() => LoginTable.loginId),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull()
});

export const LoggedInLogRelations = relations(LoggedInLogTable, ({ one }) => ({
  Login: one(LoginTable, {
    fields: [LoggedInLogTable.loginId],
    references: [LoginTable.loginId]
  })
}));

export type LoggedInLogFull = InferSelectModel<typeof LoggedInLogTable>;
export type LoggedInLogInsert = InferInsertModel<typeof LoggedInLogTable>;
