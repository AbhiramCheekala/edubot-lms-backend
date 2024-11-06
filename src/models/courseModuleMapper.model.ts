import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { CourseModuleMapperTable } from '../db/schema/courseModuleMapper.schema.js';

export async function insertCourseModuleMapping(
  mapping: typeof CourseModuleMapperTable.$inferInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<typeof CourseModuleMapperTable.$inferSelect> {
  const [newMapping] = await transactionClient
    .insert(CourseModuleMapperTable)
    .values(mapping)
    .returning();
  return newMapping;
}

export async function deleteCourseModuleMapping(
  courseId: string,
  moduleId: string,
  transactionClient = db
): Promise<void> {
  await transactionClient
    .delete(CourseModuleMapperTable)
    .where(
      and(
        eq(CourseModuleMapperTable.courseId, courseId),
        eq(CourseModuleMapperTable.moduleId, moduleId)
      )
    );
}

export async function deleteAllModulesForCourse(
  courseId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(CourseModuleMapperTable)
    .where(eq(CourseModuleMapperTable.courseId, courseId));
}

export async function queryLastModulePositionForCourse(
  courseId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<number | undefined> {
  const [result] = await transactionClient
    .select({ lastPosition: CourseModuleMapperTable.position })
    .from(CourseModuleMapperTable)
    .where(eq(CourseModuleMapperTable.courseId, courseId))
    .orderBy(desc(CourseModuleMapperTable.position))
    .limit(1);
  return result?.lastPosition;
}
