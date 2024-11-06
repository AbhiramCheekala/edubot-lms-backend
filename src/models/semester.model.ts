import { BatchTable } from '../db/schema/batch.schema.js';
import {
  FindByKeyParams,
  FindParamsOld,
  PaginationParams,
  SearchParamsOld,
  SecurityFilter,
  SortParams
} from '../db/schema/commonTypes.js';
import { and, asc, desc, eq, getTableColumns, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import exclude from '../utils/exclude.js';
import { db, Schema } from '../db/db.js';
import {
  Semester,
  SemesterInsert,
  SemesterPartial,
  SemesterSearchColumn,
  SemesterSortColumn,
  SemesterTable,
  SemesterWithBatches
} from '../db/schema/semester.schema.js';
import { UserTable } from '../db/schema/user.schema.js';

interface SecurityFilterContext {
  userRef: string;
}

function buildSelectQuery({
  transactionClient = db,
  selectColumns,
  securityFilter,
  paginationParams,
  searchParams,
  sortParams,
  joinBatchTable
}: {
  transactionClient?: NodePgDatabase<Schema>;
  selectColumns: Record<string, PgColumn | SQL>;
  securityFilter?: SecurityFilter<SecurityFilterContext>;
  paginationParams?: PaginationParams;
  searchParams?: SearchParamsOld<SemesterSearchColumn>;
  sortParams?: SortParams<SemesterSortColumn>;
  joinBatchTable?: boolean;
}): { queryWithoutWhere: PgSelect; filters: SQL[] } {
  let baseQuery: PgSelect = transactionClient
    .selectDistinct(selectColumns)
    .from(SemesterTable)
    .$dynamic();
  const filters: SQL[] = [];

  if (joinBatchTable) {
    baseQuery = baseQuery.fullJoin(BatchTable, eq(BatchTable.semesterId, SemesterTable.semesterId));
  }

  // SECURITY FILTERS
  if (securityFilter) {
    // const { scope, context } = securityFilter;
    // switch (scope) {
    //   case DataAccessScopes.self: {
    //     const subquery = db
    //       .select({ orgId: OrgUserMapTable.orgId })
    //       .from(OrgUserMapTable)
    //       .where(eq(OrgUserMapTable.userId, context.userRef));
    //     filters.push(inArray(OrgUserMapTable.orgId, subquery));
    //     break;
    //   }
    //   case DataAccessScopes.all: {
    //     // no filters needed
    //     break;
    //   }
    // }
  }

  // PAGINATION
  if (paginationParams) {
    if (paginationParams.limit) baseQuery = baseQuery.limit(paginationParams.limit);
    if (paginationParams.offset) baseQuery = baseQuery.offset(paginationParams.offset);
  }

  if (sortParams?.sortColumn) {
    const sortType = sortParams.sortType === 'DESC' ? desc : asc;
    switch (sortParams.sortColumn) {
      case 'year':
        baseQuery = baseQuery.orderBy(sortType(SemesterTable.year));
        break;
      case 'month':
        baseQuery = baseQuery.orderBy(sortType(SemesterTable.month));
        break;
      case 'year-month':
        baseQuery = baseQuery.orderBy(sortType(SemesterTable.year), sortType(SemesterTable.month));
        break;
    }
  }

  if (searchParams) {
  }

  return { queryWithoutWhere: baseQuery, filters };
}

export async function insertSemester(
  semester: SemesterInsert,
  transactionClient = db
): Promise<Semester> {
  const [newSemester] = await transactionClient
    .insert(SemesterTable)
    .values({ ...semester, updatedAt: new Date().toISOString() })
    .returning(getSanatizedSelectColumns());
  return newSemester as Semester;
}

export async function updateSemester(
  id: string,
  semester: Semester,
  transactionClient = db
): Promise<Semester> {
  // const [updatedUser] = await transactionClient
  //   .update(UserTable)
  //   .set({ ...user, updatedAt: new Date().toISOString() })
  //   .where(eq(UserTable.id, id))
  //   .returning(getSanatizedSelectColumns());
  // return updatedUser as User;
  const [updatedSemester] = await transactionClient
    .update(SemesterTable)
    .set({ ...semester, updatedAt: new Date().toISOString() })
    .where(eq(SemesterTable.semesterId, id))
    .returning(getSanatizedSelectColumns());

  return updatedSemester as Semester;
}

export async function findSemesterByField({
  transactionClient = db,
  findParams,
  includeBatches
}: {
  transactionClient: NodePgDatabase<Schema>;
  findParams: FindByKeyParams<keyof Semester, SecurityFilterContext>;
  includeBatches?: boolean;
}): Promise<SemesterWithBatches> {
  const { securityFilter, selectColumns } = findParams;
  const sanatizedSelectColumns = getSanatizedSelectColumns(selectColumns);
  if (includeBatches) {
    addBatchesClauseToSemesterSelectColumns(sanatizedSelectColumns);
  }
  const { queryWithoutWhere, filters } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    joinBatchTable: !!includeBatches,
    securityFilter
  });
  filters.push(eq(SemesterTable[findParams.findColumn], findParams.findValue));
  const query = queryWithoutWhere.where(and(...filters)).limit(1);
  const semesters = await query;
  return semesters[0] as SemesterWithBatches;
}

export async function querySemesterByYearMonthOrgCombo({
  transactionClient = db,
  year,
  month,
  orgId,
  securityFilter,
  includeBatches
}: {
  transactionClient: NodePgDatabase<Schema>;
  year: number;
  month: number;
  orgId: string;
  securityFilter?: SecurityFilter<SecurityFilterContext>;
  includeBatches?: boolean;
}): Promise<SemesterWithBatches> {
  const sanatizedSelectColumns = getSanatizedSelectColumns();
  if (includeBatches) {
    addBatchesClauseToSemesterSelectColumns(sanatizedSelectColumns);
  }
  const { queryWithoutWhere, filters } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    securityFilter,
    joinBatchTable: !!includeBatches
  });
  filters.push(
    and(
      eq(SemesterTable.year, year),
      eq(SemesterTable.month, month),
      eq(SemesterTable.orgId, orgId)
    ) as SQL
  );
  const query = queryWithoutWhere.where(and(...filters)).limit(1);
  const semesters = await query;
  return semesters[0] as SemesterWithBatches;
}

export async function queryAllSemesters({
  transactionClient = db,
  findParams,
  includeBatches
}: {
  transactionClient: NodePgDatabase<Schema>;
  findParams: FindParamsOld<SemesterSortColumn, SecurityFilterContext, SemesterSearchColumn>;
  includeBatches?: boolean;
}): Promise<SemesterPartial[]> {
  const { paginationParams, searchParams, sortParams, securityFilter, selectColumns } = findParams;
  const sanatizedSelectColumns = getSanatizedSelectColumns(selectColumns);
  if (includeBatches) {
    addBatchesClauseToSemesterSelectColumns(sanatizedSelectColumns);
  }
  const { queryWithoutWhere, filters } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    paginationParams: paginationParams?.limit
      ? { ...paginationParams, limit: paginationParams?.limit + 1 }
      : undefined,
    searchParams,
    sortParams,
    securityFilter,
    joinBatchTable: includeBatches
  });
  const query = queryWithoutWhere.where(and(...filters));
  const semesters = await query;
  return semesters as SemesterPartial[];
}

export async function deleteSemester(
  id: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Semester> {
  const [deletedSemester] = await transactionClient
    .delete(SemesterTable)
    .where(eq(SemesterTable.semesterId, id))
    .returning(getSanatizedSelectColumns());

  return deletedSemester as Semester;
}

function getSanatizedSelectColumns(
  selectColumns?: Record<string, PgColumn | SQL>
): Record<string, PgColumn | SQL> {
  return selectColumns
    ? exclude(selectColumns, ['updatedAt', 'createdAt'])
    : exclude(getTableColumns(SemesterTable), ['updatedAt', 'createdAt']);
}

function addBatchesClauseToSemesterSelectColumns(selectColumns: Record<string, PgColumn | SQL>) {
  selectColumns.batches = sql`
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'batchId', ${BatchTable.batchId},
              'name', ${BatchTable.name},
              'mentorId', ${BatchTable.mentorId},
              'batchNumber', ${BatchTable.batchNumber},
              'mentorName', ${UserTable.name}
            )
          ORDER BY ${BatchTable.batchNumber})
          FROM ${BatchTable}
          INNER JOIN ${UserTable} ON ${BatchTable.mentorId} = ${UserTable.id}
          WHERE ${BatchTable.semesterId} = ${SemesterTable.semesterId}
        ),
        '[]'
      ) as batches`;
}
