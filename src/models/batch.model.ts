import { and, asc, eq, getTableColumns, ilike, inArray, SQL, sql } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';
import { ParsedFilter, ParsedSort } from 'utils/helpers/parseFindAllQuery.js';
import { SEARCH_KEYS } from '../constants/SearchTypes.js';
import { db, Schema } from '../db/db.js';
import {
  Batch,
  BatchInsert,
  BatchSearchColumn,
  BatchSortColumn,
  BatchTable
} from '../db/schema/batch.schema.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import { OrganizationTable, SemesterTable, StudentTable, UserTable } from '../db/schema/index.js';
import { OrgUserMapTable } from '../db/schema/orgUserMap.schema.js';
import { DataAccessScopes } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import exclude from '../utils/exclude.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export async function insertBatch(batch: BatchInsert, transactionClient = db): Promise<Batch> {
  const [newbatch] = await transactionClient
    .insert(BatchTable)
    .values({ ...batch, updatedAt: new Date().toISOString() })
    .returning(getSanatizedSelectColumns());
  return newbatch as Batch;
}

export async function updateBatch(
  id: string,
  batch: BatchInsert,
  transactionClient = db
): Promise<Batch> {
  // TODO this should be moved to service?
  const sanatizedBatch = exclude(batch, ['batchId', 'semesterId', 'name', 'batchNumber']);
  const [updatedBatch] = await transactionClient
    .update(BatchTable)
    .set({ ...sanatizedBatch, updatedAt: new Date().toISOString() })
    .where(eq(BatchTable.batchId, id))
    .returning(getSanatizedSelectColumns());

  return updatedBatch as Batch;
}

function getBatchReadSecurityFilters({
  securityFilters,
  transactionClient
}: {
  securityFilters?: ResolvedSecurityFilters;
  transactionClient: NodePgDatabase<Schema>;
}): {
  filters: SQL[];
} {
  const filters: SQL[] = [];
  if (securityFilters?.batchReadScopes) {
    const { scopes, context } = securityFilters.batchReadScopes;

    if (scopes.includes(DataAccessScopes.admin.id)) {
      // No additional filters for admin
      return { filters };
    }

    if (
      scopes.includes(DataAccessScopes.organization.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const orgIdSubquery = transactionClient
        .select({ orgId: OrgUserMapTable.orgId })
        .from(OrgUserMapTable)
        .where(eq(OrgUserMapTable.userId, context.userId));

      filters.push(inArray(SemesterTable.orgId, orgIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      filters.push(eq(BatchTable.mentorId, context.userId));
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'student' &&
      context.studentId
    ) {
      const batchIdSubquery = transactionClient
        .select({ batchId: StudentTable.batchId })
        .from(StudentTable)
        .where(eq(StudentTable.studentId, context.studentId));

      filters.push(inArray(BatchTable.batchId, batchIdSubquery));
    }
  }
  return { filters };
}

export async function queryAllBatches(
  limit: number,
  page: number,
  orgId?: string,
  searchParams?: ParsedFilter<BatchSearchColumn>[],
  sortParams?: ParsedSort<BatchSortColumn>[],
  includeStudentCount?: boolean,
  transactionClient = db,
  securityFilters?: ResolvedSecurityFilters
): Promise<FindAllResults<Batch>> {
  const offset = (page - 1) * limit;

  // Start the query
  let query = transactionClient
    .select({
      batchId: BatchTable.batchId,
      name: BatchTable.name,
      batchNumber: BatchTable.batchNumber,
      mentorId: BatchTable.mentorId,
      mentorName: UserTable.name,
      semesterId: SemesterTable.semesterId,
      orgId: SemesterTable.orgId,
      orgName: OrganizationTable.name,
      year: SemesterTable.year,
      month: SemesterTable.month,
      ...(includeStudentCount
        ? { studentCount: sql<number>`COUNT(${StudentTable.studentId})` }
        : {})
    })
    .from(BatchTable)
    .leftJoin(SemesterTable, eq(BatchTable.semesterId, SemesterTable.semesterId))
    .leftJoin(OrganizationTable, eq(SemesterTable.orgId, OrganizationTable.id))
    .leftJoin(UserTable, eq(BatchTable.mentorId, UserTable.id))
    .$dynamic();

  const filters: SQL[] = [];

  // Apply security filters
  const { filters: securityFiltersSQL } = getBatchReadSecurityFilters({
    securityFilters,
    transactionClient
  });
  filters.push(...securityFiltersSQL);

  // Apply orgId filter if provided
  if (orgId) {
    filters.push(eq(SemesterTable.orgId, orgId));
  }

  // Join with StudentTable and count the number of students per batch if includeStudentCount is true
  if (includeStudentCount) {
    query = query
      .leftJoin(StudentTable, eq(StudentTable.batchId, BatchTable.batchId))
      .groupBy(
        BatchTable.batchId,
        SemesterTable.semesterId,
        SemesterTable.orgId,
        OrganizationTable.name,
        UserTable.name
      );
  }

  for (const searchParam of searchParams ?? []) {
    if (searchParam && searchParam.searchColumn === 'name') {
      switch (searchParam.searchType) {
        case SEARCH_KEYS.CONTAINS:
          filters.push(ilike(BatchTable.name, `%${searchParam.searchKey}%`));
          break;
      }
    } else if (searchParam && searchParam.searchColumn === 'orgId') {
      switch (searchParam.searchType) {
        case SEARCH_KEYS.EXACT_MATCH:
          filters.push(eq(OrganizationTable.id, searchParam.searchKey as string));
          break;
      }
    } else if (searchParam && searchParam.searchColumn === 'mentorId') {
      switch (searchParam.searchType) {
        case SEARCH_KEYS.EXACT_MATCH:
          filters.push(eq(BatchTable.mentorId, searchParam.searchKey as string));
          break;
      }
    }
  }

  query = query
    .orderBy(
      asc(OrganizationTable.name),
      asc(SemesterTable.year),
      asc(SemesterTable.month),
      asc(BatchTable.batchNumber)
    )
    .limit(limit + 1)
    .offset(offset)
    .where(and(...filters));

  const batches = await query.execute();
  const returnObj: FindAllResults<Batch> = {
    results: (batches as Batch[]).slice(0, limit),
    hasMore: batches.length > (limit || 0)
  };
  return returnObj;
}

// Update queryBatchesByOrgId to include security filters
export async function queryBatchesByOrgId(
  orgId: string,
  transactionClient = db,
  securityFilters?: ResolvedSecurityFilters
): Promise<Batch[]> {
  const subquery = transactionClient
    .select({ semesterId: SemesterTable.semesterId })
    .from(SemesterTable)
    .where(eq(SemesterTable.orgId, orgId));

  const { filters: securityFiltersSQL } = getBatchReadSecurityFilters({
    securityFilters,
    transactionClient
  });

  const batches = await transactionClient
    .select()
    .from(BatchTable)
    .where(and(inArray(BatchTable.semesterId, subquery), ...securityFiltersSQL))
    .execute();

  return batches as Batch[];
}

function getSanatizedSelectColumns(
  selectColumns?: Record<string, PgColumn>
): Record<string, PgColumn> {
  return selectColumns
    ? exclude(selectColumns, ['updatedAt', 'createdAt'])
    : exclude(getTableColumns(BatchTable), ['updatedAt', 'createdAt']);
}
