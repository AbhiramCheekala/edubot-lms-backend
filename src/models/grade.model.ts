import { and, eq, getTableColumns, sql, SQL } from 'drizzle-orm';
import { db, Schema } from '../db/db.js';
import { GradeTable, GradeFull, GradeInsert, GradeUpsert } from '../db/schema/grade.schema.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';

export async function insertGrade(
  grade: GradeInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<GradeFull> {
  const [newGrade] = await transactionClient
    .insert(GradeTable)
    .values({ ...grade, updatedAt: new Date().toISOString() })
    .returning(getSanatizedColumns());
  return newGrade as GradeFull;
}

// export async function upsertNote(
//   { contentId, note }: ReadingMaterialNoteUpsert,
//   transactionClient: NodePgDatabase<Schema> = db,
//   securityFilters?: ResolvedSecurityFilters
// ): Promise<ReadingMaterialNote> {
//   const studentId = securityFilters?.rmNotesWriteScopes?.context.studentId;
//   if (!studentId) {
//     throw new Error('Student ID does not match the context student ID');
//   }
//   const [result] = await transactionClient
//     .insert(ReadingMaterialNoteTable)
//     .values({
//       contentId,
//       studentId,
//       notes: [{ content: note }],
//       updatedAt: new Date().toISOString()
//     })
//     .onConflictDoUpdate({
//       target: [ReadingMaterialNoteTable.contentId, ReadingMaterialNoteTable.studentId],
//       set: {
//         notes: sql`${ReadingMaterialNoteTable.notes} || jsonb_build_array(jsonb_build_object('content', ${note}::text))`,
//         updatedAt: new Date().toISOString()
//       }
//     })
//     .returning();
//   return result;
// }

export async function upsertGrade(
  { submissionId, score, messages }: GradeUpsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<GradeFull> {
  const messagesMapped =
    messages?.map(({ content }) => ({
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })) ?? [];

  const newMessagesJson = JSON.stringify(messagesMapped);

  const [result] = await transactionClient
    .insert(GradeTable)
    .values({
      submissionId,
      ...(score && { score }),
      feedback: { messages: messagesMapped },
      updatedAt: new Date().toISOString()
    })
    .onConflictDoUpdate({
      target: [GradeTable.submissionId],
      set: {
        score,
        feedback: sql`jsonb_set(
          COALESCE(${GradeTable.feedback}, '{"messages":[]}'::jsonb),
          '{messages}',
          (COALESCE(${GradeTable.feedback}->'messages', '[]'::jsonb) || 
           ${newMessagesJson}::jsonb)
        )`,
        updatedAt: new Date().toISOString()
      }
    })
    .returning(getSanatizedColumns());

  return result as GradeFull;
}

export async function queryGradeByField(
  field: Extract<keyof GradeFull, 'gradeId' | 'submissionId'>,
  value: string,
  transactionClient: NodePgDatabase<Schema> = db,
  selectColumns?: Record<string, PgColumn>
): Promise<GradeFull | null> {
  const baseQuery: PgSelect = transactionClient
    .select(getSanatizedColumns(selectColumns))
    .from(GradeTable)
    .$dynamic();
  const filters: SQL[] = [eq(GradeTable[field], value)];

  const [grade] = await baseQuery.where(and(...filters)).limit(1);
  return grade as GradeFull | null;
}

export async function updateGrade(
  gradeId: string,
  updateData: Partial<Omit<GradeFull, 'gradeId' | 'createdAt' | 'updatedAt'>>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<GradeFull | null> {
  const [updatedGrade] = await transactionClient
    .update(GradeTable)
    .set({ ...updateData, updatedAt: new Date().toISOString() })
    .where(eq(GradeTable.gradeId, gradeId))
    .returning(getSanatizedColumns());
  return updatedGrade as GradeFull | null;
}

function getSanatizedColumns(selectColumns?: Record<string, PgColumn>): Record<string, PgColumn> {
  if (selectColumns) {
    // TODO: verify columns are correct
    return selectColumns;
  }
  return getTableColumns(GradeTable);
}
