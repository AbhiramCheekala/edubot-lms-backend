import { InferSelectModel } from 'drizzle-orm';
import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const ContentGroupTable = pgTable('content_group', {
  contentGroupId: uuid('content_group_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull()
});

export type ContentGroupFull = InferSelectModel<typeof ContentGroupTable>;
export type ContentGroup = Omit<ContentGroupFull, 'updatedAt' | 'createdAt'>;
export type ContentGroupKey = keyof ContentGroup;
export type ContentGroupPartial = Partial<ContentGroup>;
export type ContentGroupInsert = InferSelectModel<typeof ContentGroupTable>;
