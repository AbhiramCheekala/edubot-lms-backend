import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { ContentJoined } from './content.schema.js';
import { ContentGroupTable } from './contentGroup.schema.js';
import { ModuleSectionType } from './enums.js';
import { AssignmentTable } from './assignment.schema.js';
import { ModuleAndSectionMappingsTable } from './moduleAndSectionMappings.schema.js';

export const ModuleSectionTable = pgTable('module_section', {
  moduleSectionId: uuid('module_section_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  title: varchar('name', { length: 255 }).notNull(),
  // summary: text('summary').notNull(),
  contentGroup: uuid('content_group_id')
    .notNull()
    .references(() => ContentGroupTable.contentGroupId),
  sectionType: ModuleSectionType('section_type').notNull()
});

export const ModuleSectionRelations = relations(ModuleSectionTable, ({ one, many }) => ({
  assignment: one(AssignmentTable, {
    fields: [ModuleSectionTable.moduleSectionId],
    references: [AssignmentTable.moduleSectionId]
  }),
  moduleSectionMapper: many(ModuleAndSectionMappingsTable),
  contentGroup: one(ContentGroupTable, {
    fields: [ModuleSectionTable.contentGroup],
    references: [ContentGroupTable.contentGroupId]
  })
}));

export type ModuleSectionJoined = InferSelectModel<typeof ModuleSectionTable> & ContentJoined;
export type ModuleSectionFull = InferSelectModel<typeof ModuleSectionTable>;
export type ModuleSectionInsert = Omit<InferInsertModel<typeof ModuleSectionTable>, 'updatedAt'>;
export type ModuleSection = Omit<ModuleSectionFull, 'updatedAt' | 'createdAt'>;
export type ModuleSectionKey = keyof ModuleSection;
export type ModuleSectionPartial = Partial<ModuleSection>;
