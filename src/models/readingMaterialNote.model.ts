import { eq, sql } from 'drizzle-orm';
import {
  ReadingMaterialNote,
  ReadingMaterialNoteTable,
  ReadingMaterialNoteUpsert
} from '../db/schema/readingMaterialNote.schema.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';

export async function upsertNote(
  { contentId, note }: ReadingMaterialNoteUpsert,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters
): Promise<ReadingMaterialNote> {
  const studentId = securityFilters?.rmNotesWriteScopes?.context.studentId;
  if (!studentId) {
    throw new Error('Student ID does not match the context student ID');
  }
  const [result] = await transactionClient
    .insert(ReadingMaterialNoteTable)
    .values({
      contentId,
      studentId,
      notes: [{ content: note }],
      updatedAt: new Date().toISOString()
    })
    .onConflictDoUpdate({
      target: [ReadingMaterialNoteTable.contentId, ReadingMaterialNoteTable.studentId],
      set: {
        notes: sql`${ReadingMaterialNoteTable.notes} || jsonb_build_array(jsonb_build_object('content', ${note}::text))`,
        updatedAt: new Date().toISOString()
      }
    })
    .returning();
  return result;
}

export async function queryStudentNotesForContent(
  { contentId }: { contentId: string },
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters
): Promise<ReadingMaterialNote[]> {
  const studentId = securityFilters?.rmNotesReadScopes?.context.studentId;
  if (!studentId) {
    throw new Error('Student ID is required');
  }
  const notes = await transactionClient
    .select()
    .from(ReadingMaterialNoteTable)
    .where(eq(ReadingMaterialNoteTable.contentId, contentId));
  return notes;
}
