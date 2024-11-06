import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { uuid, varchar, boolean, text, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { OrgUserMapTable } from './orgUserMap.schema.js';

export const OrganizationTable = pgTable(
  'organization',
  {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    givenOrgId: varchar('given_org_id', { length: 50 }).notNull().unique(),
    state: varchar('state', { length: 50 }).notNull(),
    address: varchar('address', { length: 250 }).notNull(),
    pincode: varchar('pincode', { length: 10 }).notNull(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    contactPhoneNumber: jsonb('contact_phone_number')
      .$type<{ countryCode: string; number: string }>()
      .notNull(),
    githubOrgUri: text('github_org_uri').notNull()
  },
  (table) => {
    return {
      email_key: uniqueIndex('org_email_key').using('btree', table.email),
      org_id_key: uniqueIndex('org_id_key').using('btree', table.id),
      given_org_id: uniqueIndex('given_org_id').using('btree', table.id)
    };
  }
);

export const OrganizationRelations = relations(OrganizationTable, ({ many }) => ({
  OrgUserMap: many(OrgUserMapTable)
}));

export type Organization = InferSelectModel<typeof OrganizationTable>;
export type OrganizationInsert = InferInsertModel<typeof OrganizationTable>;
export type OrganizationPartial = Partial<Organization>;
export type OrganizationName = Pick<Organization, 'name'>;
export type OrganizationSearchColumn = Extract<keyof Organization, 'name' | 'givenOrgId' | 'email'>;
export type OrgSortColumn = Extract<keyof Organization, 'name' | 'givenOrgId'>;
export type OrgKey = keyof Organization;
