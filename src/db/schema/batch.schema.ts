import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { SemesterTable } from './semester.schema.js';
import { UserTable } from './user.schema.js';
import { integer } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const BatchTable = pgTable(
  'batch',
  {
    batchId: uuid('batch_id').defaultRandom().primaryKey().notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    mentorId: uuid('mentor_id')
      .references(() => UserTable.id)
      .notNull(),
    semesterId: uuid('semester_id')
      .references(() => SemesterTable.semesterId)
      .notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
    batchNumber: integer('batch_number').notNull()
  },
  (table) => {
    return {
      batchNameKey: uniqueIndex('batch_name_key').using('btree', table.name),
      batchSemesterIdKey: index('batch_semester_id_key').using('btree', table.semesterId),
      semesterIdBatchNumberKey: uniqueIndex('semester_id_batch_number_key').using(
        'btree',
        table.semesterId,
        table.batchNumber
      )
    };
  }
);

export const BatchRelations = relations(BatchTable, ({ one }) => ({
  Mentor: one(UserTable, {
    fields: [BatchTable.mentorId],
    references: [UserTable.id]
  }),
  Semester: one(SemesterTable, {
    fields: [BatchTable.semesterId],
    references: [SemesterTable.semesterId]
  })
}));

export type BatchFull = InferSelectModel<typeof BatchTable>;
export type Batch = Omit<BatchFull, 'updatedAt' | 'createdAt'>;
export type BatchInsertFull = InferInsertModel<typeof BatchTable>;
export type BatchPartial = Partial<Batch>;
export type BatchName = Pick<Batch, 'name'>;
export type BatchSearchColumn = Extract<keyof Batch, 'name'> | 'orgId' | 'mentorId';
export type BatchSortColumn = Extract<keyof Batch, 'name'> | 'year-month';
export type BatchKey = keyof Batch;
export type BatchPick<K extends BatchKey> = Pick<Batch, K>;
export type BatchInsert = Omit<InferInsertModel<typeof BatchTable>, 'updatedAt' | 'createdAt'>;
