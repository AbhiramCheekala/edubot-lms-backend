import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { ConversationTable } from './conversation.schema.js';

export const SharedLinkTable = pgTable('SharedLink', {
  id: text('id').primaryKey().notNull(),
  conversationId: text('conversationId')
    .notNull()
    .references(() => ConversationTable.id),
  createdAt: text('createdAt').default('').notNull()
});

export const SharedLinkRelations = relations(SharedLinkTable, ({ one }) => ({
  Conversation: one(ConversationTable, {
    fields: [SharedLinkTable.conversationId],
    references: [ConversationTable.id]
  })
}));

export type SharedLinkFull = InferSelectModel<typeof SharedLinkTable>;
export type SharedLinkInsert = InferInsertModel<typeof SharedLinkTable>;
