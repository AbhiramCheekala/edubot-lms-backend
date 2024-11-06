import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { ModuleAndSectionMappingsTable } from '../db/schema/moduleAndSectionMappings.schema.js';

// Functions for ModuleAndSectionMappingsTable

export async function insertModuleAndSectionMapping(
  mapping: typeof ModuleAndSectionMappingsTable.$inferInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<typeof ModuleAndSectionMappingsTable.$inferSelect> {
  const [newMapping] = await transactionClient
    .insert(ModuleAndSectionMappingsTable)
    .values(mapping)
    .returning();
  return newMapping;
}

export async function deleteModuleAndSectionMapping(
  moduleId: string,
  moduleSectionId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(ModuleAndSectionMappingsTable)
    .where(
      and(
        eq(ModuleAndSectionMappingsTable.moduleId, moduleId),
        eq(ModuleAndSectionMappingsTable.moduleSectionId, moduleSectionId)
      )
    );
}

export async function deleteAllSectionsForModule(
  moduleId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient
    .delete(ModuleAndSectionMappingsTable)
    .where(eq(ModuleAndSectionMappingsTable.moduleId, moduleId));
}

export async function queryLastSectionPositionForModule(
  moduleId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<number | undefined> {
  const [result] = await transactionClient
    .select({ lastPosition: ModuleAndSectionMappingsTable.position })
    .from(ModuleAndSectionMappingsTable)
    .where(eq(ModuleAndSectionMappingsTable.moduleId, moduleId))
    .orderBy(desc(ModuleAndSectionMappingsTable.position))
    .limit(1);
  return result?.lastPosition;
}
