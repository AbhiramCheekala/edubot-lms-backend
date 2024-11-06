import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { integer, pgTable, primaryKey, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { ModuleTable } from './module.schema.js';
import { ModuleSectionTable } from './moduleSection.schema.js';

// Module-ModuleSection Mapper Table
export const ModuleAndSectionMappingsTable = pgTable(
  'module_section_mapper',
  {
    // moduleSectionMapperId: uuid('module_section_mapper_id').defaultRandom().primaryKey().notNull(),
    // createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    // updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
    position: integer('position').notNull(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => ModuleTable.moduleId),
    moduleSectionId: uuid('module_section_id')
      .notNull()
      .references(() => ModuleSectionTable.moduleSectionId)
  },
  (table) => {
    return {
      pkModuleSectionUnique: primaryKey({ columns: [table.moduleId, table.moduleSectionId] }),
      module_position_key: uniqueIndex('module_position_key').using(
        'btree',
        table.moduleId,
        table.position
      )
    };
  }
);

export const ModuleAndSectionMappingsRelations = relations(
  ModuleAndSectionMappingsTable,
  ({ one }) => ({
    module: one(ModuleTable, {
      fields: [ModuleAndSectionMappingsTable.moduleId],
      references: [ModuleTable.moduleId]
    }),
    moduleSection: one(ModuleSectionTable, {
      fields: [ModuleAndSectionMappingsTable.moduleSectionId],
      references: [ModuleSectionTable.moduleSectionId]
    })
  })
);

export type ModuleSectionMapperFull = InferSelectModel<typeof ModuleAndSectionMappingsTable>;
export type ModuleSectionMapper = Omit<ModuleSectionMapperFull, 'updatedAt' | 'createdAt'>;
export type ModuleSectionMapperInsert = InferInsertModel<typeof ModuleAndSectionMappingsTable>;
