import { integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { ContentTable } from './content.schema.js';
import { ContentGroupTable } from './contentGroup.schema.js';

export const ContentAndGroupMappingsTable = pgTable(
  'content_and_group_mappings',
  {
    contentGroupId: uuid('content_group_id')
      .notNull()
      .references(() => ContentGroupTable.contentGroupId),
    contentId: uuid('content_id')
      .notNull()
      .references(() => ContentTable.contentId),
    position: integer('position').notNull()
  },
  (table) => {
    return {
      pkContentAndGroupMappings: primaryKey({ columns: [table.contentGroupId, table.position] })
    };
  }
);
