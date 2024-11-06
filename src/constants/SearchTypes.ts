export enum SEARCH_KEYS {
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  EXACT_MATCH = 'EXACT_MATCH',
  DATE_RANGE = 'DATE_RANGE'
}

export const SearchTypes = {
  [SEARCH_KEYS.CONTAINS]: {
    name: 'Contains'
  },
  [SEARCH_KEYS.STARTS_WITH]: {
    name: 'Starts With'
  },
  [SEARCH_KEYS.EXACT_MATCH]: {
    name: 'Exact Match'
  },
  [SEARCH_KEYS.DATE_RANGE]: {
    name: 'Date Range'
  }
} as const;

export const SearchKeys = Object.keys(SearchTypes) as SEARCH_KEYS[];

export type SearchType = keyof typeof SEARCH_KEYS;
