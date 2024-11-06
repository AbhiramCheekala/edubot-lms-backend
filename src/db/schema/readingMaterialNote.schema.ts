import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { jsonb, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { ContentTable } from './content.schema.js';
import { StudentTable } from './student.schema.js';

export const ReadingMaterialNoteTable = pgTable(
  'reading_material_note',
  {
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
    // moduleSectionId: uuid('module_section_id')
    //   .notNull()
    //   .references(() => ModuleSectionTable.moduleSectionId),
    contentId: uuid('content_id')
      .notNull()
      .references(() => ContentTable.contentId),
    studentId: uuid('student_id')
      .notNull()
      .references(() => StudentTable.studentId),
    notes: jsonb('notes').notNull().$type<{ content: string }[]>()
  },
  (table) => {
    return {
      moduleSectionIdContentIdPrimaryKey: primaryKey({
        columns: [table.contentId, table.studentId]
      })
      // moduleSectionIdContentIdPrimaryKey: primaryKey({
      //   columns: [table.moduleSectionId, table.contentId, table.studentId]
      // }),
      // moduleSectionIdContentIdUnique: uniqueIndex('module_section_id_content_id_unique').using(
      //   'btree',
      //   table.studentId,
      //   table.contentId
      // )
    };
  }
);

export type ReadingMaterialNote = InferSelectModel<typeof ReadingMaterialNoteTable>;
export type ReadingMaterialNoteInsert = InferInsertModel<typeof ReadingMaterialNoteTable>;
export type ReadingMaterialNoteUpsert = {
  contentId: string;
  note: string;
};
