import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { ContentPartial } from './content.schema.js';
import { CourseModuleMapperTable } from './courseModuleMapper.schema.js';
import { ModuleSectionTypes } from './enums.js';
import { ModuleAndSectionMappingsTable } from './moduleAndSectionMappings.schema.js';

export const ModuleTable = pgTable('module', {
  moduleId: uuid('module_id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  summary: text('summary').notNull()
});

export const ModuleRelations = relations(ModuleTable, ({ many }) => ({
  courseModuleMapper: many(CourseModuleMapperTable),
  moduleSectionMapper: many(ModuleAndSectionMappingsTable)
}));

type ModuleSectionSub = {
  title: string;
  contents: Array<ContentPartial>;
  position: number;
  createdAt: string;
  updatedAt: string;
  sectionType: ModuleSectionTypes;
  contentGroup: string;
  assignmentInfo: {
    createdAt: string;
    updatedAt: string;
    autoGrading: boolean;
    assignmentId: string;
    platformType: string;
    testCaseGrading: boolean;
    templateRepository: string;
  } | null;
  moduleSectionId: string;
};

export type ModuleFull = InferSelectModel<typeof ModuleTable>;
export type Module = Omit<ModuleFull, 'updatedAt' | 'createdAt'>;
export type ModuleInsert = Omit<
  InferInsertModel<typeof ModuleTable>,
  'updatedAt' | 'createdAt' | 'moduleId'
>;
export type ModuleSortColumn = Extract<keyof Module, 'title'>;
export type ModuleSearchColumn = Extract<keyof ModuleFull, 'title'>;
export type ModulePartial = Partial<Module>;
export type ModuleJoined = ModuleFull & {
  moduleSections: ModuleSectionSub[];
  position: number;
};
export type ModuleKey = keyof Module;
