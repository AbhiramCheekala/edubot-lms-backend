import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { TokenStudentObject } from '../../middlewares/verifyToken.js';
import { AccountType } from './enums.js';
import { RoleTable } from './role.schema.js';
import { TokenTable } from './token.schema.js';
import { UserFull } from './user.schema.js';

export const LoginTable = pgTable(
  'login',
  {
    loginId: uuid('login_id').defaultRandom().primaryKey().notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    accountType: AccountType('account_type').notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
    role: uuid('role')
      .references(() => RoleTable.id)
      .notNull()
  },
  (table) => {
    return {
      email_key: uniqueIndex('login_email_key').using('btree', table.email)
    };
  }
);

export const LoginRelations = relations(LoginTable, ({ one, many }) => ({
  Role: one(RoleTable, {
    fields: [LoginTable.role],
    references: [RoleTable.id]
  }),
  Token: many(TokenTable)
}));

export type LoginFull = InferSelectModel<typeof LoginTable>;
export type LoginJoined = LoginFull & { student?: TokenStudentObject; user: UserFull };
export type LoginInsert = InferInsertModel<typeof LoginTable>;
export type Login = Omit<LoginFull, 'passwordHash' | 'updatedAt' | 'createdAt'>;
export type LoginPartial = Partial<Login>;
export type LoginKey = keyof Login;
