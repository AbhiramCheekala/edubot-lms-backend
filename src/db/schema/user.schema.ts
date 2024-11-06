import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { boolean, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { Login, LoginKey, LoginTable } from './login.schema.js';
import { OrgUserMapTable } from './orgUserMap.schema.js';
import { Organization, OrgKey } from './organization.schema.js';
import { Role, RoleKey } from './role.schema.js';

export const UserTable = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  givenUserId: varchar('given_user_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  joiningDate: timestamp('joiningDate', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  loginId: uuid('login_id')
    .references(() => LoginTable.loginId)
    .notNull()
    .unique(),
  contactPhoneNumber: jsonb('contact_phone_number')
    .$type<{ countryCode: string; number: string }>()
    .notNull()
});

export const UserRelations = relations(UserTable, ({ many }) => ({
  Orgs: many(OrgUserMapTable)
}));

export type UserFull = InferSelectModel<typeof UserTable> & Login;
export type UserInsert = InferInsertModel<typeof UserTable>;
export type User = Omit<UserFull, 'password' | 'updatedAt' | 'createdAt'>;
export type UserJoined = User & Login & Organization & Role;
export type UserJoinedPartial = Partial<UserJoined>;
export type UserSortColumn = Extract<keyof User, 'name' | 'joiningDate'>;
export type UserSearchColumn =
  | Extract<keyof UserFull, 'name' | 'isActive' | 'givenUserId'>
  | 'organization'
  | 'role'
  | 'orgId';
export type ContactPhoneNumber = { countryCode: string; number: string };
export type UserKey = keyof InferInsertModel<typeof UserTable>;
export type UserPartial = Partial<User & { role: string }>;
export type UserPick<K extends keyof User> = Pick<User, K>;
export type UserKeyFull = UserKey | LoginKey | OrgKey | RoleKey;
