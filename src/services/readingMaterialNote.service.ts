import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { queryStudentNotesForContent, upsertNote } from '../models/readingMaterialNote.model.js';
import { ReadingMaterialNoteUpsert } from '../db/schema/readingMaterialNote.schema.js';
import { db, Schema } from '../db/db.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';

export async function findStudentNotesForContent(
  contentId: string,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters
) {
  return queryStudentNotesForContent({ contentId }, transactionClient, securityFilters);
}

export async function addReadingMaterialNote(
  notesRecord: ReadingMaterialNoteUpsert,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters
) {
  return upsertNote(notesRecord, transactionClient, securityFilters);
}
