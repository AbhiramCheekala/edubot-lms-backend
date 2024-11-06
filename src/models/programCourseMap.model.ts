import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { eq } from 'drizzle-orm';
import { ProgramCourseMapTable } from '../db/schema/programCourseMap.schema.js';

export async function addCoursesToProgram(
  { programId, courseId, position }: { programId: string; courseId: string; position: number },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient.insert(ProgramCourseMapTable).values({
    programId,
    courseId,
    position
  });
}

export async function deleteProgramCourses(
  programId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(ProgramCourseMapTable)
    .where(eq(ProgramCourseMapTable.programId, programId));
}
