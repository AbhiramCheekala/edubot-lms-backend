import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { TokenType } from './enums.js';
import { LoginTable } from './login.schema.js';

export const TokenTable = pgTable('token', {
  token: text('token').primaryKey().notNull(),
  type: TokenType('type').notNull(),
  expires: timestamp('expires', { precision: 3, mode: 'string' }).notNull(),
  blacklisted: boolean('blacklisted').notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  customData: jsonb('custom_data').$type<{ role: string }>().notNull(),
  loginId: uuid('user_id')
    .notNull()
    .references(() => LoginTable.loginId, { onDelete: 'cascade', onUpdate: 'cascade' })
});

export const TokenRelations = relations(TokenTable, ({ one }) => ({
  User: one(LoginTable, {
    fields: [TokenTable.loginId],
    references: [LoginTable.loginId]
  })
}));

export type Token = InferSelectModel<typeof TokenTable>;
export type TokenInsert = InferInsertModel<typeof TokenTable>;
export type TokenPartial = Partial<Token>;
