import { pgTable } from 'drizzle-orm/pg-core';
import { uuid } from 'drizzle-orm/pg-core';
import { OrganizationTable } from './organization.schema.js';
import { UserTable } from './user.schema.js';
import { uniqueIndex } from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';

export const OrgUserMapTable = pgTable(
  'org_user_map',
  {
    orgId: uuid('org_id')
      .references(() => OrganizationTable.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => UserTable.id)
      .notNull()
  },
  (table) => {
    return {
      org_user_map_key: uniqueIndex('org_user_map_key').using('btree', table.orgId, table.userId),
      // To enforce 1:1 relation, can remove this index later to suport M:N relationships
      org_user_map_user_id_index: uniqueIndex('org_user_map_user_id_index').using(
        'btree',
        table.userId
      )
    };
  }
);

export const OrgUserMapRelations = relations(OrgUserMapTable, ({ one }) => ({
  Org: one(OrganizationTable, {
    fields: [OrgUserMapTable.orgId],
    references: [OrganizationTable.id]
  }),
  User: one(UserTable, {
    fields: [OrgUserMapTable.userId],
    references: [UserTable.id]
  })
}));

export type OrgUserMapEntry = InferSelectModel<typeof OrgUserMapTable>;
export type OrgUserMapEntryInsert = InferInsertModel<typeof OrgUserMapTable>;
