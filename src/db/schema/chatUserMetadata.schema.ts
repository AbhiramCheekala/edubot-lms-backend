import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { LoginTable } from './login.schema.js';
import { ConversationTable } from './conversation.schema.js';

export const ChatUserMetadataTable = pgTable('ChatUserMetadata', {
  loginId: uuid('login_id')
    .primaryKey()
    .notNull()
    .references(() => LoginTable.loginId, { onDelete: 'cascade' }),
  lastTool: text('last_tool'),
  lastConversationId: text('last_conversation_id').references(() => ConversationTable.id)
});

export const ChatUserMetadataRelations = relations(ChatUserMetadataTable, ({ one }) => ({
  Login: one(LoginTable, {
    fields: [ChatUserMetadataTable.loginId],
    references: [LoginTable.loginId]
  })
}));

export type ChatUserMetadataFull = InferSelectModel<typeof ChatUserMetadataTable>;
export type ChatUserMetadataInsert = InferInsertModel<typeof ChatUserMetadataTable>;
