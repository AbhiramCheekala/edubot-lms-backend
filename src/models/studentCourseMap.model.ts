import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { studentCourseMapTable } from '../db/schema/studentCourseMap.schema.js';
import { CourseTable } from '../db/schema/course.schema.js';
import { StudentTable } from '../db/schema/student.schema.js';

//add a student into studentCourseMap table
export async function insertStudentCourseMapping(
  { studentId, courseId }: { studentId: string; courseId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .insert(studentCourseMapTable)
    .values({
      studentId,
      courseId
    })
    .onConflictDoNothing();
}

// Delete a specific course mapping for a student
export async function deleteCourseMapping(
  { studentId, courseId }: { studentId: string; courseId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(studentCourseMapTable)
    .where(
      and(
        eq(studentCourseMapTable.studentId, studentId),
        eq(studentCourseMapTable.courseId, courseId)
      )
    );
}

//delete all course map for a student
export async function deleteAllCourseMappingsForStudent(
  studentId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(studentCourseMapTable)
    .where(eq(studentCourseMapTable.studentId, studentId));
}

//delete all student for a course
export async function deleteAllStudentMappingsForCourse(
  courseId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(studentCourseMapTable)
    .where(eq(studentCourseMapTable.courseId, courseId));
}

export async function queryStudentsInCourse(
  courseId: string,
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
    .from(studentCourseMapTable)
    .innerJoin(StudentTable, eq(studentCourseMapTable.studentId, StudentTable.studentId))
    .where(eq(studentCourseMapTable.courseId, courseId));
}

export async function queryCoursesForStudent(
  studentId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<any[]> {
  return await transactionClient
    .select({
      courseId: CourseTable.courseId,
      name: CourseTable.name,
      givenCourseId: CourseTable.givenCourseId,
      description: CourseTable.description,
      isActive: CourseTable.isActive
    })
    .from(studentCourseMapTable)
    .innerJoin(CourseTable, eq(studentCourseMapTable.courseId, CourseTable.courseId))
    .where(eq(studentCourseMapTable.studentId, studentId));
}
