import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { Grade, GradeFull, GradeInsert, GradeUpsert } from '../db/schema/grade.schema.js';
import { insertGrade, queryGradeByField, updateGrade, upsertGrade } from '../models/grade.model.js';

export async function createGrade(
  grade: GradeInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<GradeFull> {
  const newGrade = await insertGrade(grade, transactionClient);
  return newGrade as GradeFull;
}

export const findGradeBySubmissionId = async (
  submissionId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Grade> => {
  const grade = await queryGradeByField('submissionId', submissionId, transactionClient);
  return grade as Grade;
};

export const modifyGrade = async (
  gradeId: string,
  { score, feedback }: Partial<Pick<GradeInsert, 'score' | 'feedback'>>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<GradeFull> => {
  const updatedGradeData = {
    ...(score && { score }),
    ...(feedback && { feedback })
  };
  const updatedGrade = await updateGrade(gradeId, updatedGradeData, transactionClient);
  return updatedGrade as GradeFull;
};

export async function createGradeOrApplyModifications(
  grade: GradeUpsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<GradeFull> {
  return upsertGrade(grade, transactionClient);
}
