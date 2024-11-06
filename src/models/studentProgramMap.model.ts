import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { stduentProgramMapTable } from '../db/schema/studentProgramMap.schema.js';
import { ProgramTable } from '../db/schema/program.schema.js';
import { StudentTable } from '../db/schema/student.schema.js';

//insert a data into studentProgramMap table
export async function insertStudentProgramMapping(
  { studentId, programId }: { studentId: string; programId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .insert(stduentProgramMapTable)
    .values({
      studentId,
      programId
    })
    .onConflictDoNothing();
}

// Delete a specific program mapping for a student
export async function deleteProgramMapping(
  { studentId, programId }: { studentId: string; programId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(stduentProgramMapTable)
    .where(
      and(
        eq(stduentProgramMapTable.studentId, studentId),
        eq(stduentProgramMapTable.programId, programId)
      )
    );
}

// Delete all student mappings for a program
export async function deleteAllStudentMappingsForProgram(
  programId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(stduentProgramMapTable)
    .where(eq(stduentProgramMapTable.programId, programId));
}

//delete all programs for a student
export async function deleteAllProgramMappingsForStudent(
  studentId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(stduentProgramMapTable)
    .where(eq(stduentProgramMapTable.studentId, studentId));
}

export async function queryStudentsInProgram(
  programId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<any[]> {
  return await transactionClient
    .select({
      studentId: StudentTable.studentId,
      givenStudentId: StudentTable.givenStudentId,
      name: StudentTable.name,
      personalEmail: StudentTable.personalEmail,
      dateOfBirth: StudentTable.dateOfBirth,
      gender: StudentTable.gender,
      isActive: StudentTable.isActive,
      joiningDate: StudentTable.joiningDate,
      contactPhoneNumber: StudentTable.contactPhoneNumber
    })
    .from(stduentProgramMapTable)
    .innerJoin(StudentTable, eq(stduentProgramMapTable.studentId, StudentTable.studentId))
    .where(eq(stduentProgramMapTable.programId, programId));
}

export async function queryProgramsForStudent(
  studentId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<any[]> {
  return await transactionClient
    .select({
      programId: ProgramTable.programId,
      name: ProgramTable.name,
      givenProgramId: ProgramTable.givenProgramId,
      description: ProgramTable.description,
      skills: ProgramTable.skills,
      duration: ProgramTable.duration,
      isActive: ProgramTable.isActive
    })
    .from(stduentProgramMapTable)
    .innerJoin(ProgramTable, eq(stduentProgramMapTable.programId, ProgramTable.programId))
    .where(eq(stduentProgramMapTable.studentId, studentId));
}
