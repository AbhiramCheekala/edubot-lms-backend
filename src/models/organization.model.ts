// import { and, eq, SQL } from 'drizzle-orm';
import { and, asc, desc, eq, getTableColumns, ilike, inArray, or, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';
import { SEARCH_KEYS } from '../constants/SearchTypes.js';
import { db, Schema } from '../db/db.js';
import {
  FindAllResults,
  FindByKeyParams,
  FindParams,
  PaginationParams,
  SecurityFilter
} from '../db/schema/commonTypes.js';
import {
  BatchTable,
  Organization,
  OrganizationInsert,
  OrganizationPartial,
  OrganizationSearchColumn,
  OrganizationTable,
  OrgSortColumn,
  OrgUserMapTable,
  SemesterTable,
  StudentTable
} from '../db/schema/index.js';
import { DataAccessScopes } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import exclude from '../utils/exclude.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';

interface SecurityFilterContext {
  userRef: string;
}

function getOrganizationReadSecurityFilters({
  securityFilters,
  transactionClient
}: {
  securityFilters?: ResolvedSecurityFilters;
  transactionClient: NodePgDatabase<Schema>;
}): {
  filters: SQL[];
} {
  const filters: SQL[] = [];
  if (securityFilters?.organizationReadScopes) {
    const { scopes, context } = securityFilters.organizationReadScopes;

    if (scopes.includes(DataAccessScopes.admin.id)) {
      // No additional filters for admin
      return { filters };
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const orgIdSubquery = transactionClient
        .select({ orgId: OrgUserMapTable.orgId })
        .from(OrgUserMapTable)
        .where(eq(OrgUserMapTable.userId, context.userId));

      filters.push(inArray(OrganizationTable.id, orgIdSubquery));
    }

    if (
      scopes.includes(DataAccessScopes.supervisor.id) &&
      context.accountType === 'user' &&
      context.userId
    ) {
      const orgIdSubquery = transactionClient
        .selectDistinct({ orgId: StudentTable.orgId })
        .from(StudentTable)
        .innerJoin(BatchTable, eq(BatchTable.batchId, StudentTable.batchId))
        .where(eq(BatchTable.mentorId, context.userId));

      const orgIdSelfSubquery = transactionClient
        .select({ orgId: OrgUserMapTable.orgId })
        .from(OrgUserMapTable)
        .where(eq(OrgUserMapTable.userId, context.userId));

      filters.push(
        or(
          inArray(OrganizationTable.id, orgIdSubquery),
          inArray(OrganizationTable.id, orgIdSelfSubquery)
        )!
      );
    }

    if (
      scopes.includes(DataAccessScopes.self.id) &&
      context.accountType === 'student' &&
      context.studentId
    ) {
      const orgIdSubquery = transactionClient
        .select({ orgId: StudentTable.orgId })
        .from(StudentTable)
        .where(eq(StudentTable.studentId, context.studentId));

      filters.push(inArray(OrganizationTable.id, orgIdSubquery));
    }
  }
  return { filters };
}

function buildSelectQuery({
  transactionClient = db,
  selectColumns,
  paginationParams,
  searchParams,
  sortParams,
  // securityFilter,
  joinOrgUserMapTable,
  joinStudentTable = false,
  joinBatchTable = false,
  securityFilters
}: {
  transactionClient?: NodePgDatabase<Schema>;
  selectColumns: Record<string, PgColumn | SQL<number>>;
  joinOrgUserMapTable?: boolean;
  paginationParams?: PaginationParams;
  searchParams?: ParsedFilter<OrganizationSearchColumn>[];
  sortParams?: ParsedSort<OrgSortColumn>[];
  securityFilter?: SecurityFilter<SecurityFilterContext>;
  joinStudentTable?: boolean;
  joinBatchTable?: boolean;
  securityFilters?: ResolvedSecurityFilters;
}): { queryWithoutWhere: PgSelect; filters: SQL[]; sortOperators: SQL[] } {
  let baseQuery: PgSelect = transactionClient
    .selectDistinct(selectColumns)
    .from(OrganizationTable)
    .$dynamic();
  const filters: SQL[] = [];

  if (joinOrgUserMapTable) {
    baseQuery = baseQuery.leftJoin(
      OrgUserMapTable,
      eq(OrgUserMapTable.orgId, OrganizationTable.id)
    );
  }

  if (joinStudentTable) {
    baseQuery = baseQuery
      .leftJoin(StudentTable, eq(OrganizationTable.id, StudentTable.orgId))
      .groupBy(OrganizationTable.id);
  }

  if (joinBatchTable) {
    baseQuery = baseQuery
      .leftJoin(SemesterTable, eq(OrganizationTable.id, SemesterTable.orgId))
      .leftJoin(BatchTable, eq(BatchTable.semesterId, SemesterTable.semesterId))
      .groupBy(OrganizationTable.id);
  }

  // PAGINATION
  if (paginationParams) {
    if (paginationParams.limit) baseQuery = baseQuery.limit(paginationParams.limit);
    if (paginationParams.offset) baseQuery = baseQuery.offset(paginationParams.offset);
  }

  // SORTING
  const sortOperators = [];
  for (const sortParam of sortParams ?? []) {
    const sortType = sortParam.sortType === 'DESC' ? desc : asc;

    switch (sortParam.sortColumn) {
      case 'name':
        sortOperators.push(sortType(OrganizationTable.name));
        break;
      case 'givenOrgId':
        sortOperators.push(sortType(OrganizationTable.givenOrgId));
        break;
    }
  }

  // SEARCH
  for (const searchParam of searchParams ?? []) {
    switch (searchParam.searchColumn) {
      case 'name':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(OrganizationTable.name, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(OrganizationTable.name, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(OrganizationTable.name, `${searchParam.searchKey}%`));
          }
        }
        break;

      case 'givenOrgId':
        if (searchParam.searchKey) {
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(OrganizationTable.givenOrgId, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(OrganizationTable.givenOrgId, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(OrganizationTable.givenOrgId, `${searchParam.searchKey}%`));
          }
        }
        break;

      case 'email':
        if (searchParam.searchKey) {
          // filters.push(ilike(OrganizationTable.name, searchParam.searchKey));
          if (searchParam.searchType === SEARCH_KEYS.CONTAINS) {
            filters.push(ilike(OrganizationTable.email, `%${searchParam.searchKey}%`));
          } else if (searchParam.searchType === SEARCH_KEYS.EXACT_MATCH) {
            filters.push(ilike(OrganizationTable.email, searchParam.searchKey as string));
          } else if (searchParam.searchType === SEARCH_KEYS.STARTS_WITH) {
            filters.push(ilike(OrganizationTable.email, `${searchParam.searchKey}%`));
          }
        }
        break;
    }
  }

  const { filters: securityFiltersSQL } = getOrganizationReadSecurityFilters({
    securityFilters,
    transactionClient
  });
  filters.push(...securityFiltersSQL);

  return { queryWithoutWhere: baseQuery, filters, sortOperators };
}

export async function findOrganizationByField({
  transactionClient = db,
  findParams,
  joinOptions = {
    includeStudentCount: false,
    includeBatchCount: false
  },
  securityFilters
}: {
  transactionClient: NodePgDatabase<Schema>;
  findParams: FindByKeyParams<keyof Organization, SecurityFilterContext>;
  joinOptions?: {
    includeStudentCount?: boolean;
    includeBatchCount?: boolean;
  };
  securityFilters?: ResolvedSecurityFilters;
}): Promise<OrganizationPartial | null> {
  const { securityFilter, selectColumns } = findParams;
  const joinOrgUserMapTable = true;
  // const joinOrgUserMapTable = securityFilter?.scope === DataAccessScopes.organization;
  const joinStudentTable = joinOptions.includeStudentCount;
  const joinBatchTable = joinOptions.includeBatchCount;
  const sanatizedSelectColumns = getSanatizedSelectColumns(
    selectColumns,
    joinBatchTable,
    joinStudentTable
  );
  const { queryWithoutWhere, filters } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    joinOrgUserMapTable,
    securityFilter,
    joinStudentTable,
    joinBatchTable,
    securityFilters
  });
  filters.push(eq(OrganizationTable[findParams.findColumn], findParams.findValue));
  const query = queryWithoutWhere.where(and(...filters)).limit(1);
  const organizations = await query;
  return organizations[0];
}

export async function findAllOrganizations({
  transactionClient = db,
  findParams,
  includeStudentCount = false,
  includeBatchCount = false,
  securityFilters
}: {
  transactionClient: NodePgDatabase<Schema>;
  findParams: FindParams<OrgSortColumn, SecurityFilterContext, OrganizationSearchColumn>;
  includeStudentCount?: boolean;
  includeBatchCount?: boolean;
  securityFilters?: ResolvedSecurityFilters;
}): Promise<FindAllResults<OrganizationPartial>> {
  const { paginationParams, searchParams, sortParams, securityFilter, selectColumns } = findParams;
  const joinStudentTable = includeStudentCount;
  const joinBatchTable = includeBatchCount;
  const sanatizedSelectColumns = getSanatizedSelectColumns(
    selectColumns,
    joinBatchTable,
    joinStudentTable
  );
  const { queryWithoutWhere, filters, sortOperators } = buildSelectQuery({
    transactionClient,
    selectColumns: sanatizedSelectColumns,
    paginationParams: paginationParams?.limit
      ? { ...paginationParams, limit: paginationParams?.limit + 1 }
      : undefined,
    searchParams,
    sortParams,
    securityFilter,
    joinStudentTable,
    joinBatchTable,
    securityFilters
  });
  const query = queryWithoutWhere.where(and(...filters)).orderBy(...sortOperators);
  const organizations = await query;
  const returnObj: FindAllResults<OrganizationPartial> = {
    results: (organizations as OrganizationPartial[]).slice(0, paginationParams?.limit),
    hasMore: organizations.length > (paginationParams?.limit || 0)
  };
  return returnObj;
}

export async function insertOrganization(
  transactionClient: NodePgDatabase<Schema> = db,
  Organization: Omit<OrganizationInsert, 'updatedAt'>
): Promise<Organization> {
  const [newOrganization] = await transactionClient
    .insert(OrganizationTable)
    .values({ ...Organization, updatedAt: new Date().toISOString() })
    .returning(getSanatizedSelectColumns());
  return newOrganization as Organization;
}

export async function updateOrganization(
  id: string,
  transactionClient: NodePgDatabase<Schema> = db,
  organization: OrganizationPartial
): Promise<Organization> {
  const [updatedOrganization] = await transactionClient
    .update(OrganizationTable)
    .set({ ...organization, updatedAt: new Date().toISOString() })
    .where(eq(OrganizationTable.id, id))
    .returning(getSanatizedSelectColumns());
  return updatedOrganization as Organization;
}

function getSanatizedSelectColumns(
  selectColumns?: Record<string, PgColumn | SQL<number>>,
  includeBatchCount: boolean = false,
  includeStudentCount: boolean = false
): Record<string, PgColumn | SQL<number>> {
  const retCols = selectColumns
    ? exclude(selectColumns, ['updatedAt', 'createdAt'])
    : exclude(getTableColumns(OrganizationTable), ['updatedAt', 'createdAt']);

  return addJoinedTableColumns(retCols, includeBatchCount, includeStudentCount);
}

function addJoinedTableColumns(
  selectColumns: Record<string, PgColumn | SQL<number>>,
  includeBatchCount: boolean = false,
  includeStudentCount: boolean = false
): Record<string, PgColumn | SQL<number>> {
  const retCols = selectColumns;
  if (includeBatchCount) {
    retCols.batchCount = sql`count(distinct ${BatchTable.batchId})`;
  }

  if (includeStudentCount) {
    retCols.studentCount = sql`count(distinct ${StudentTable.studentId})`;
  }

  return retCols;
}
