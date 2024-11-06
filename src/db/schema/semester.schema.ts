import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { Batch, BatchTable } from './batch.schema.js';
import { OrganizationTable } from './organization.schema.js';

export const SemesterTable = pgTable(
  'semester',
  {
    semesterId: uuid('semester_id').defaultRandom().primaryKey().notNull(),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    orgId: uuid('org_id')
      .references(() => OrganizationTable.id)
      .notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull()
  },
  (table) => {
    return {
      semesterYmoKey: uniqueIndex('semester_ymo_key').using(
        'btree',
        table.orgId,
        table.year,
        table.month
      ),
      semesterIdKey: uniqueIndex('semester_id_key').using('btree', table.semesterId)
    };
  }
);

export const SemesterRelations = relations(SemesterTable, ({ one, many }) => ({
  Batches: many(BatchTable),
  Organization: one(OrganizationTable, {
    fields: [SemesterTable.orgId],
    references: [OrganizationTable.id]
  })
}));

export type SemesterFull = InferSelectModel<typeof SemesterTable>;
export type Semester = Omit<SemesterFull, 'updatedAt' | 'createdAt'>;
export type SemesterInsertFull = InferInsertModel<typeof SemesterTable>;
export type SemesterPartial = Partial<SemesterFull>;
export type SemesterName = Pick<SemesterFull, 'year' | 'month'>;
export type SemesterSearchColumn = Extract<keyof SemesterFull, 'year' | 'month'> | 'orgName';
export type SemesterSortColumn =
  | Extract<keyof SemesterFull, 'year' | 'month'>
  | 'year-month'
  | 'orgName';
export type SemesterKey = keyof Semester;
export type SemesterPick<K extends SemesterKey> = Pick<Semester, K>;
export type SemesterInsert = Omit<SemesterInsertFull, 'updatedAt' | 'createdAt'>;
export type SemesterWithBatches = Semester & { batches: Omit<Batch, 'semesterId'>[] };
