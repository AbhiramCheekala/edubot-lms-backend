import { ParsedFilter, ParsedSort } from '../../utils/helpers/parseFindAllQuery.js';
import { SearchType } from '../../constants/SearchTypes.js';
import { PgColumn } from 'drizzle-orm/pg-core';
import { DataAccessScope } from '../../permissions/DataAccessScopes.ts';
import { ResolvedSecurityFilters } from '../../permissions/securityFilterTypes.js';

export type SortType = 'ASC' | 'DESC';

export interface PaginationParams {
  limit: number;
  offset?: number;
}

export interface SortParams<SortColumn> {
  sortColumn: SortColumn;
  sortType?: SortType;
}

export interface SecurityFilter<SecurityFilterContext> {
  scope: DataAccessScope;
  context: SecurityFilterContext;
}

export interface SecurityFilterDefaultContext {
  userRef: string;
}

export interface SecurityFilterDefault {
  scope: DataAccessScope;
  context: SecurityFilterDefaultContext;
}

export type SearchKey = {
  numericValue?: number;
  stringValue?: string;
  booleanValue?: boolean;
};

export type BuildSelectQueryReturnType = {
  queryWithoutWhere: PgSelect;
  filters: SQL[];
  sortOperators?: SQL[];
  groupByClauses?: PgColumn[];
};

export interface SearchParams<SearchColumn> {
  searchKey: SearchKey;
  searchColumn: SearchColumn;
  searchType: SearchType;
}

export interface SearchParamsOld<SearchColumn> {
  searchKey: SearchKey;
  searchColumn: SearchColumn;
}

export interface FindParams<SortColumn, SecurityFilterContext, SearchColumn> {
  // depricated don't use
  paginationParams?: PaginationParams;
  sortParams?: ParsedSort<SortColumn>[];
  securityFilter?: SecurityFilter<SecurityFilterContext>;
  searchParams?: ParsedFilter<SearchColumn>[];
  selectColumns?: Record<string, PgColumn>;
}

export interface FindParamsRSF<SortColumn, SearchColumn> {
  paginationParams?: PaginationParams;
  sortParams?: ParsedSort<SortColumn>[];
  securityFilters?: ResolvedSecurityFilters;
  searchParams?: ParsedFilter<SearchColumn>[];
  selectColumns?: Record<string, PgColumn>;
}

export interface FindParamsOld<SortColumn, SecurityFilterContext, SearchColumn> {
  // depricated don't use
  paginationParams?: PaginationParams;
  sortParams?: SortParams<SortColumn>;
  securityFilter?: SecurityFilter<SecurityFilterContext>;
  searchParams?: SearchParamsOld<SearchColumn>;
  selectColumns?: Record<string, PgColumn>;
}

export interface FindByKeyParams<TColumn, SecurityFilterContext> {
  findValue: typeof TColumn;
  findColumn: TColumn;
  securityFilter?: SecurityFilter<SecurityFilterContext>;
  selectColumns?: Record<string, PgColumn>;
}

export interface FindByKeyParamsRSF<TColumn> {
  findValue: typeof TColumn;
  findColumn: TColumn;
  securityFilters?: ResolvedSecurityFilters;
  selectColumns?: Record<string, PgColumn>;
}

export interface FindAllResults<T> {
  results: T[];
  hasMore: boolean;
}
