import { SearchKeys } from '../../constants/SearchTypes.js';
import { Request } from 'express';

export type ValidFieldType = string | number | boolean | 'uuid' | Date | [Date, Date];

export interface QueryField<T extends ValidFieldType> {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'uuid' | 'date' | 'dateRange';
  validValues?: T[];
}

export interface FilterField<T extends ValidFieldType> extends QueryField<T> {
  searchTypes?: string[];
}

export interface ParsedFilter<SearchColumn> {
  searchColumn: SearchColumn;
  searchType: string | boolean | number | Date | [Date, Date];
  searchKey: ValidFieldType;
}

export interface ParsedSort<SortColumn> {
  sortColumn: SortColumn;
  sortType: 'ASC' | 'DESC';
}

export interface ParsedQuery<SearchColumn, SortColumn> {
  limit?: number;
  page?: number;
  searchParams: ParsedFilter<SearchColumn>[];
  sortParams: ParsedSort<SortColumn>[];
}

export function parseQuery<
  FC extends string,
  SC extends string,
  F extends ValidFieldType,
  S extends ValidFieldType
>(req: Request, filterFields: FilterField<F>[], sortFields: QueryField<S>[]): ParsedQuery<FC, SC> {
  const parsedQuery: ParsedQuery<FC, SC> = {
    searchParams: [],
    sortParams: []
  };

  // Parse limit and page
  if (req.query.limit) parsedQuery.limit = parseInt(req.query.limit as string, 10);
  if (req.query.page) parsedQuery.page = parseInt(req.query.page as string, 10);

  if (Array.isArray(req.query.filters)) {
    parsedQuery.searchParams = req.query.filters.reduce((acc: ParsedFilter<FC>[], filter: any) => {
      const { field, searchType, searchKey } = filter;
      const filterField = filterFields.find((f) => f.field === field);

      if (filterField) {
        const allowedSearchTypes = filterField.searchTypes ?? SearchKeys;

        if (allowedSearchTypes.includes(searchType)) {
          let parsedSearchKey: ValidFieldType;

          switch (filterField.type) {
            case 'number':
              parsedSearchKey = parseFloat(searchKey);
              break;
            case 'boolean':
              if (searchKey === 'true' || searchKey === 'false')
                parsedSearchKey = searchKey.toLowerCase() === 'true';
              else return acc;
              break;
            case 'uuid':
            case 'string':
              parsedSearchKey = searchKey;
              break;
            case 'date':
              parsedSearchKey = new Date(searchKey);
              break;
            case 'dateRange':
              try {
                const dateArray = JSON.parse(searchKey);
                if (Array.isArray(dateArray) && dateArray.length === 2) {
                  const [start, end] = dateArray.map((d) => new Date(d));

                  if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    if (start <= end) {
                      parsedSearchKey = [start, end];
                    } else {
                      console.warn('Invalid date range: start date is after end date');
                      return acc;
                    }
                  } else {
                    console.warn('Invalid date format in range');
                    return acc;
                  }
                } else {
                  console.warn('Invalid date range format: expected array of two elements');
                  return acc;
                }
              } catch (error) {
                console.warn('Invalid JSON format for date range');
                return acc;
              }
              break;
            default:
              return acc;
          }

          if (
            !filterField.validValues ||
            filterField.validValues.includes(parsedSearchKey as (typeof filterField.validValues)[0])
          ) {
            acc.push({
              searchColumn: field as FC,
              searchType,
              searchKey: parsedSearchKey
            });
          }
        }
      }

      return acc;
    }, []);
  }

  // Parse sorts
  if (Array.isArray(req.query.sorts)) {
    parsedQuery.sortParams = req.query.sorts.reduce((acc: ParsedSort<SC>[], sort: any) => {
      const { field, order } = sort;
      const sortField = sortFields.find((s) => s.field === field);

      if (sortField && (order === 'ASC' || order === 'DESC')) {
        acc.push({
          sortColumn: field as SC,
          sortType: order
        });
      }

      return acc;
    }, []);
  }

  return parsedQuery;
}
