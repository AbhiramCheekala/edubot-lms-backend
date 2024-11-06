import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { OrgUserMapTable } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export async function insertOrgUserMapping(
  transactionClient: NodePgDatabase<Schema> = db,
  { orgId, userId }: { orgId: string; userId: string }
): Promise<void> {
  await transactionClient.insert(OrgUserMapTable).values({
    orgId,
    userId
  });
}

export async function updateOrgUserMapping(
  transactionClient: NodePgDatabase<Schema> = db,
  { orgId, userId }: { orgId: string; userId: string }
): Promise<void> {
  await transactionClient
    .update(OrgUserMapTable)
    .set({ orgId })
    .where(eq(OrgUserMapTable.userId, userId));
}
