import { and, eq, getTableColumns, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { BinaryObjectTable } from '../db/schema/binaryObject.schema.js';
import {
  ContentFull,
  ContentInsert,
  ContentJoined,
  ContentTable
} from '../db/schema/content.schema.js';
import pick from '../utils/pick.js';

type JoinOptions = { includeBinaryObject?: boolean };
const defaultJoinOptions: JoinOptions = { includeBinaryObject: false };

export async function insertContent(
  content: ContentInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ContentFull> {
  const [newContent] = await transactionClient
    .insert(ContentTable)
    .values({ ...content, updatedAt: new Date().toISOString() })
    .returning(getSanatizedColumns());
  return newContent as ContentFull;
}

export async function queryContentByField(
  field: Extract<keyof ContentFull, 'contentId' | 'url' | 'binaryObjectRef'>,
  value: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  selectColumns?: Record<string, PgColumn>
): Promise<ContentJoined> {
  let baseQuery: PgSelect = transactionClient
    .select(getSanatizedColumns(selectColumns, joinOptions))
    .from(ContentTable)
    .$dynamic();
  const filters: SQL[] = [];
  filters.push(eq(ContentTable[field], value));

  if (joinOptions.includeBinaryObject) {
    baseQuery = baseQuery.leftJoin(
      BinaryObjectTable,
      eq(ContentTable.binaryObjectRef, BinaryObjectTable.binaryObjectId)
    );
  }

  const [content] = await baseQuery.where(and(...filters)).limit(1);
  return content as ContentJoined;
}

function getSanatizedColumns(
  selectColumns?: Record<string, PgColumn>,
  joinOptions: JoinOptions = defaultJoinOptions
): Record<string, PgColumn> {
  if (selectColumns) {
    // TODO verify columns are correct
    return selectColumns;
  }
  const contentColumns: Record<string, PgColumn> = pick(getTableColumns(ContentTable), [
    'contentId',
    'createdAt',
    'type',
    'url',
    'binaryObjectRef'
  ]) as Record<string, PgColumn>;
  if (joinOptions.includeBinaryObject) {
    const binaryObjectCols = getTableColumns(BinaryObjectTable);
    contentColumns.binaryObjectCreatedAt = binaryObjectCols.createdAt;
    contentColumns.binaryObjectUpdatedAt = binaryObjectCols.updatedAt;
    contentColumns.binaryObjectMimeType = binaryObjectCols.mimeType;
    contentColumns.binaryObjectOriginalFileName = binaryObjectCols.originalFileName;
    contentColumns.binaryObjectFileSize = binaryObjectCols.fileSize;
    contentColumns.binaryObjectContainerName = binaryObjectCols.containerName;
    contentColumns.binaryObjectStorageAccountName = binaryObjectCols.storageAccountName;
    contentColumns.binaryObjectBlobName = binaryObjectCols.blobName;
    contentColumns.binaryObjectMetadata = binaryObjectCols.metadata;
  }
  return contentColumns;
}
