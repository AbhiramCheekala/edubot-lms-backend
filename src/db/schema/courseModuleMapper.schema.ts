import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { integer, pgTable, primaryKey, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { CourseTable } from './course.schema.js';
import { ModuleTable } from './module.schema.js';

// Course-Module Mapper Table
export const CourseModuleMapperTable = pgTable(
  'course_module_mapper',
  {
    // courseModuleMapperId: uuid('course_module_mapper_id').defaultRandom().primaryKey().notNull(),
    // createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    // updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
    position: integer('position').notNull(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => CourseTable.courseId),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => ModuleTable.moduleId)
  },
  (table) => {
    return {
      courseModulePrimaryKey: primaryKey({ columns: [table.courseId, table.moduleId] }),
      coursePositionKey: uniqueIndex('course_position_key').using(
        'btree',
        table.courseId,
        table.position
      )
    };
  }
);

export const CourseModuleMapperRelations = relations(CourseModuleMapperTable, ({ one }) => ({
  course: one(CourseTable, {
    fields: [CourseModuleMapperTable.courseId],
    references: [CourseTable.courseId]
  }),
  module: one(ModuleTable, {
    fields: [CourseModuleMapperTable.moduleId],
    references: [ModuleTable.moduleId]
  })
}));

export type CourseModuleMapperFull = InferSelectModel<typeof CourseModuleMapperTable>;
export type CourseModuleMapper = Omit<CourseModuleMapperFull, 'updatedAt' | 'createdAt'>;
export type CourseModuleMapperInsert = InferInsertModel<typeof CourseModuleMapperTable>;
