import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { ConversationTable } from './conversation.schema.js';

export const MessageTable = pgTable('Message', {
  id: text('id').primaryKey().notNull(),
  content: text('content').notNull(),
  role: text('role').notNull(),
  outputs: jsonb('outputs'),
  file: text('file').default('').notNull(),
  filename: jsonb('filename'),
  createdAt: text('createdAt').default('').notNull(),
  conversationId: text('conversationId')
    .notNull()
    .references(() => ConversationTable.id),
  contentLabel: text('contentLabel').default('').notNull()
});

export const MessageRelations = relations(MessageTable, ({ one }) => ({
  Conversation: one(ConversationTable, {
    fields: [MessageTable.conversationId],
    references: [ConversationTable.id]
  })
}));

export type MessageFull = InferSelectModel<typeof MessageTable>;
export type MessageInsert = InferInsertModel<typeof MessageTable>;
