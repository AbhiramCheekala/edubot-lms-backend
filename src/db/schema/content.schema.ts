import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { BinaryObjectFull, BinaryObjectTable } from './binaryObject.schema.js';
import { ContentType } from './enums.js';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const ContentTable = pgTable('content', {
  contentId: uuid('content_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  // contentGroupId: uuid('content_group_id')
  //   .notNull()
  //   .references(() => ContentGroupTable.contentGroupId),
  type: ContentType('type').notNull(),
  url: text('url'),
  binaryObjectRef: uuid('binary_object_ref').references(() => BinaryObjectTable.binaryObjectId)
});

export type ContentJoined = InferSelectModel<typeof ContentTable> & BinaryObjectFull;
export type ContentFull = InferSelectModel<typeof ContentTable>;
export type Content = Omit<ContentFull, 'updatedAt' | 'createdAt'>;
export type ContentKey = keyof Content;
export type ContentPartial = Partial<Content>;
export type ContentInsert = Omit<
  InferInsertModel<typeof ContentTable>,
  'updatedAt' | 'createdAt' | 'contentId'
>;
