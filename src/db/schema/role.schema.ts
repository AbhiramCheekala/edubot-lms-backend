import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { PermissionSetName } from './enums.js';

export const RoleTable = pgTable(
  'role',
  {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    roleName: varchar('role_name', { length: 50 }).notNull(),
    permissionSetName: PermissionSetName('permission_set_name').notNull()
  },
  (table) => {
    return {
      email_key: uniqueIndex('role_name_key').using('btree', table.roleName)
    };
  }
);

export type RoleFull = InferSelectModel<typeof RoleTable>;
export type Role = InferSelectModel<typeof RoleTable>;
export type RoleInsert = InferInsertModel<typeof RoleTable>;
export type RoleSearchColumn = Extract<keyof RoleFull, 'roleName' | 'id'>;
export type RolePartial = Partial<RoleFull>;
export type RoleName = Pick<RoleFull, 'roleName'>;
export type RoleKey = keyof Role;
