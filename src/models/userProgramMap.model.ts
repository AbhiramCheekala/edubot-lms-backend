import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { UserProgramMapEntry, UserProgramMapTable } from '../db/schema/userProgramMap.schema.js';

//insert a data into userProgramMap table
export async function insertUserProgramMapping(
  { userId, programId }: { userId: string; programId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .insert(UserProgramMapTable)
    .values({
      userId,
      programId
    })
    .onConflictDoNothing();
}

// Delete a specific program mapping for a user
export async function deleteUserProgramMapping(
  { userId, programId }: { userId: string; programId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(UserProgramMapTable)
    .where((eq(UserProgramMapTable.userId, userId), eq(UserProgramMapTable.programId, programId)));
}

// Delete all user mappings for a program
export async function deleteAllUserMappingsForProgram(
  programId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(UserProgramMapTable)
    .where(eq(UserProgramMapTable.programId, programId));
}

//delete all programs for a user
export async function deleteAllProgramMappingsForUser(
  userId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient.delete(UserProgramMapTable).where(eq(UserProgramMapTable.userId, userId));
}

export async function getUserProgramMappings(
  userId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<UserProgramMapEntry[]> {
  const userProgramMappings = await transactionClient
    .select()
    .from(UserProgramMapTable)
    .where(eq(UserProgramMapTable.userId, userId));
  return userProgramMappings;
}
