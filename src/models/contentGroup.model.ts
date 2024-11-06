import { and, eq, getTableColumns, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { BinaryObjectTable } from '../db/schema/binaryObject.schema.js';
import { ContentTable } from '../db/schema/content.schema.js';
import { ContentAndGroupMappingsTable } from '../db/schema/contentAngGroupMappings.schema.js';
import {
  ContentGroupFull,
  ContentGroupInsert,
  ContentGroupTable
} from '../db/schema/contentGroup.schema.js';
import pick from '../utils/pick.js';

export type JoinOptions = { includeContents: boolean };
export const defaultJoinOptions: JoinOptions = { includeContents: false };

export async function insertContentGroup(
  contentGroup: Partial<ContentGroupInsert> = {},
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ContentGroupFull> {
  const [newContentGroup] = await transactionClient
    .insert(ContentGroupTable)
    .values({ ...contentGroup, updatedAt: new Date().toISOString() })
    .returning(getSanatizedColumns());
  return newContentGroup as ContentGroupFull;
}

export async function queryContentGroupByField(
  field: Extract<keyof ContentGroupFull, 'contentGroupId'>,
  value: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  selectColumns?: Record<string, PgColumn>
): Promise<ContentGroupFull | null> {
  let baseQuery: PgSelect = transactionClient
    .select(getSanatizedColumns(selectColumns, joinOptions))
    .from(ContentGroupTable)
    .$dynamic();
  const filters: SQL[] = [eq(ContentGroupTable[field], value)];
  const groupByClauses: PgColumn[] = [];

  if (joinOptions.includeContents) {
    baseQuery = baseQuery
      .leftJoin(
        ContentAndGroupMappingsTable,
        eq(ContentGroupTable.contentGroupId, ContentAndGroupMappingsTable.contentGroupId)
      )
      .leftJoin(ContentTable, eq(ContentTable.contentId, ContentAndGroupMappingsTable.contentId))
      .leftJoin(
        BinaryObjectTable,
        eq(ContentTable.binaryObjectRef, BinaryObjectTable.binaryObjectId)
      );
    groupByClauses.push(ContentGroupTable.contentGroupId);
  }

  const [contentGroup] = await baseQuery
    .where(and(...filters))
    .limit(1)
    .groupBy(() => [...groupByClauses]);
  return contentGroup as ContentGroupFull | null;
}

// function addBatchesClauseToSemesterSelectColumns(selectColumns: any) {
//   selectColumns.batches = sql`
//       COALESCE(
//         (
//           SELECT jsonb_agg(
//             jsonb_build_object(
//               'batchId', ${BatchTable.batchId},
//               'name', ${BatchTable.name},
//               'mentorId', ${BatchTable.mentorId},
//               'batchNumber', ${BatchTable.batchNumber}
//             )
//           ORDER BY ${BatchTable.batchNumber})
//           FROM ${BatchTable}
//           WHERE ${BatchTable.semesterId} = ${SemesterTable.semesterId}
//         ),
//         '[]'
//       ) as batches`;
// }

function getSanatizedColumns(
  selectColumns?: Record<string, PgColumn>,
  joinOptions: JoinOptions = defaultJoinOptions
): Record<string, PgColumn | SQL> {
  if (selectColumns) {
    // TODO: verify columns are correct
    return selectColumns;
  }
  const contentGroupColumns: Record<string, PgColumn | SQL> = pick(
    getTableColumns(ContentGroupTable),
    ['contentGroupId', 'createdAt', 'updatedAt']
  ) as Record<string, PgColumn | SQL>;
  if (joinOptions.includeContents) {
    contentGroupColumns.contents = contentsJsonColumns();
  }
  return contentGroupColumns;
}

export function contentsJsonColumns() {
  return sql`
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'contentId', ${ContentTable.contentId},
          'type', ${ContentTable.type},
          'url', ${ContentTable.url},
          'binaryObjectRef', ${ContentTable.binaryObjectRef},
          'position', ${ContentAndGroupMappingsTable.position},
          'binaryObject', jsonb_build_object(
            'mimeType', ${BinaryObjectTable.mimeType},
            'originalFileName', ${BinaryObjectTable.originalFileName},
            'fileSize', ${BinaryObjectTable.fileSize},
            'containerName', ${BinaryObjectTable.containerName},
            'storageAccountName', ${BinaryObjectTable.storageAccountName},
            'blobName', ${BinaryObjectTable.blobName},
            'metadata', ${BinaryObjectTable.metadata}
          )
        ) 
        ORDER BY ${ContentAndGroupMappingsTable.position}
      ),
      '[]'::jsonb
    ) AS contents
  `;
}
