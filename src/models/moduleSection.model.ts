import { and, eq, getTableColumns, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { BinaryObjectTable } from '../db/schema/binaryObject.schema.js';
import { ContentTable } from '../db/schema/content.schema.js';
import { ContentAndGroupMappingsTable } from '../db/schema/contentAngGroupMappings.schema.js';
import { ContentGroupTable } from '../db/schema/contentGroup.schema.js';
import {
  ModuleSectionFull,
  ModuleSectionInsert,
  ModuleSectionPartial,
  ModuleSectionTable
} from '../db/schema/moduleSection.schema.js';
import { contentsJsonColumns } from './contentGroup.model.js';
import pick from '../utils/pick.js';

export type JoinOptions = { includeContentGroup: boolean };
export const defaultJoinOptions = { includeContentGroup: false };

export async function insertModuleSection(
  moduleSection: ModuleSectionInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ModuleSectionFull> {
  const [newModuleSection] = await transactionClient
    .insert(ModuleSectionTable)
    .values({ ...moduleSection, updatedAt: new Date().toISOString() })
    .returning(getSanatizedColumns());
  return newModuleSection as ModuleSectionFull;
}

export async function queryModuleSectionByField(
  field: Extract<keyof ModuleSectionFull, 'moduleSectionId'>,
  value: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  selectColumns?: Record<string, PgColumn>
): Promise<ModuleSectionFull | null> {
  let baseQuery: PgSelect = transactionClient
    .select(getSanatizedColumns(selectColumns, joinOptions))
    .from(ModuleSectionTable)
    .$dynamic();
  const filters: SQL[] = [eq(ModuleSectionTable[field], value)];
  const groupByClauses: PgColumn[] = [];

  if (joinOptions?.includeContentGroup) {
    baseQuery = baseQuery
      .leftJoin(
        ContentGroupTable,
        eq(ModuleSectionTable.contentGroup, ContentGroupTable.contentGroupId)
      )
      .leftJoin(
        ContentAndGroupMappingsTable,
        eq(ContentGroupTable.contentGroupId, ContentAndGroupMappingsTable.contentGroupId)
      )
      .leftJoin(ContentTable, eq(ContentTable.contentId, ContentAndGroupMappingsTable.contentId))
      .leftJoin(
        BinaryObjectTable,
        eq(ContentTable.binaryObjectRef, BinaryObjectTable.binaryObjectId)
      );
    groupByClauses.push(ModuleSectionTable.moduleSectionId, ContentGroupTable.contentGroupId);
  }

  const [moduleSection] = await baseQuery
    .where(and(...filters))
    .groupBy(() => [...groupByClauses])
    .limit(1);
  return moduleSection as ModuleSectionFull | null;
}

export async function updateModuleSection(
  moduleSectionId: string,
  updateData: Pick<ModuleSectionInsert, 'title'>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ModuleSectionPartial> {
  const updatedModuleSection = transactionClient
    .update(ModuleSectionTable)
    .set(updateData)
    .where(eq(ModuleSectionTable.moduleSectionId, moduleSectionId))
    .returning(getSanatizedColumns());
  return updatedModuleSection as ModuleSectionPartial;
}
function getSanatizedColumns(
  selectColumns?: Record<string, PgColumn | SQL>,
  joinOptions: JoinOptions = defaultJoinOptions
): Record<string, PgColumn | SQL> {
  if (selectColumns) {
    // TODO: verify columns are correct
    return selectColumns;
  }
  const moduleSectionColumns: Record<string, PgColumn | SQL> = pick(
    getTableColumns(ModuleSectionTable),
    ['moduleSectionId', 'contentGroup', 'createdAt', 'updatedAt', 'sectionType', 'title']
  ) as Record<string, PgColumn | SQL>;
  if (joinOptions.includeContentGroup) {
    moduleSectionColumns.contentGroupCreatedAt = ContentGroupTable.createdAt;
    moduleSectionColumns.contentGroupUpdatedAt = ContentGroupTable.updatedAt;
    moduleSectionColumns.contents = contentsJsonColumns();
  }
  return getTableColumns(ModuleSectionTable);
}
