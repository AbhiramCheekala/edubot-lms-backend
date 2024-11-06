import { db, Schema } from '../db/db.js';
import { Batch } from '../db/schema/index.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { queryAllBatches, queryBatchesByOrgId } from '../models/batch.model.js';
import { BatchSearchColumn, BatchSortColumn } from '../db/schema/batch.schema.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';

export async function findBatchesByOrgId(
  orgId: string,
  transactionClient: NodePgDatabase<Schema>,
  securityFilters?: ResolvedSecurityFilters
): Promise<Batch[]> {
  const batches = await queryBatchesByOrgId(orgId, transactionClient, securityFilters);
  return batches;
}

export async function findAllBatches(
  limit?: number,
  page?: number,
  orgId?: string,
  includeStudentCount?: boolean,
  searchParams?: ParsedFilter<BatchSearchColumn>[],
  sortParams?: ParsedSort<BatchSortColumn>[],
  securityFilters?: ResolvedSecurityFilters,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<FindAllResults<Batch>> {
  const batches = await queryAllBatches(
    limit ?? 10,
    page ?? 1,
    orgId,
    searchParams,
    sortParams,
    includeStudentCount,
    transactionClient,
    securityFilters
  );
  return batches;
}
