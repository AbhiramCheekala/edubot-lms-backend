import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const BinaryObjectTable = pgTable('binary_object', {
  binaryObjectId: uuid('binary_object_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  mimeType: varchar('mime_type', { length: 200 }).notNull(),
  originalFileName: varchar('original_file_name', { length: 150 }).notNull(),
  fileSize: varchar('file_size', { length: 100 }).notNull(),
  storageAccountName: varchar('storage_account_name', { length: 150 }).notNull(),
  containerName: varchar('container_name', { length: 100 }).notNull(),
  blobName: varchar('blob_name', { length: 200 }).notNull(),
  metadata: jsonb('metadata').notNull(),
  blobUrl: text('blob_url').notNull()
});

export type BinaryObjectFull = InferSelectModel<typeof BinaryObjectTable>;
export type BinaryObject = Omit<BinaryObjectFull, 'updatedAt' | 'createdAt'>;
export type BinaryObjectKey = keyof BinaryObject;
export type BinaryObjectPartial = Partial<BinaryObject>;
export type BinaryObjectInsert = InferInsertModel<typeof BinaryObjectTable>;
