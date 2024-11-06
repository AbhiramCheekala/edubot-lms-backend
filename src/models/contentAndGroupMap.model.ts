import { and, desc, eq } from 'drizzle-orm';
import { db, Schema } from '../db/db.js';
import { ContentAndGroupMappingsTable } from '../db/schema/contentAngGroupMappings.schema.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export async function insertContentAndGroupMap(
  mapping: typeof ContentAndGroupMappingsTable.$inferInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<typeof ContentAndGroupMappingsTable.$inferSelect> {
  const [newMapping] = await transactionClient
    .insert(ContentAndGroupMappingsTable)
    .values(mapping)
    .returning();
  return newMapping;
}

export async function deleteContentAndGroupMap(
  contentId: string,
  contentGroupId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(ContentAndGroupMappingsTable)
    .where(
      and(
        eq(ContentAndGroupMappingsTable.contentId, contentId),
        eq(ContentAndGroupMappingsTable.contentGroupId, contentGroupId)
      )
    );
}

export async function deleteAllContentForGroup(
  groupId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(ContentAndGroupMappingsTable)
    .where(eq(ContentAndGroupMappingsTable.contentGroupId, groupId));
}

export async function queryLastContentPositionForGroup(
  groupId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<number | undefined> {
  const [result] = await transactionClient
    .select({ lastPosition: ContentAndGroupMappingsTable.position })
    .from(ContentAndGroupMappingsTable)
    .where(eq(ContentAndGroupMappingsTable.contentGroupId, groupId))
    .orderBy(desc(ContentAndGroupMappingsTable.position))
    .limit(1);
  return result?.lastPosition;
}
