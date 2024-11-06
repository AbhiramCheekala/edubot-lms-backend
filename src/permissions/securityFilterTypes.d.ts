// securityFilterTypes.ts
import { Action } from './Actions.js';
import { DataAccessScope } from './DataAccessScopes.js';

export type SecurityFilterParam = {
  identifier: ResolvedSecurityFilterKey;
  action: Action;
};

export type SecurityFilterContext = {
  loginId: string;
  userId?: string;
  studentId?: string;
  accountType: 'user' | 'student';
  // Add any other context properties you need
};

export type ResolvedSecurityFilter = {
  scopes: DataAccessScope[];
  context: SecurityFilterContext;
};

export type ResolvedSecurityFilterKey =
  | 'userReadScopes'
  | 'userWriteScopes'
  | 'submissionReadScopes'
  | 'studentReadScopes'
  | 'studentWriteScopes'
  | 'submissionWriteScopes'
  | 'rmNotesReadScopes'
  | 'rmNotesWriteScopes'
  | 'courseReadScopes'
  | 'courseWriteScopes'
  | 'programReadScopes'
  | 'programWriteScopes'
  | 'moduleReadScopes'
  | 'moduleWriteScopes'
  | 'assignmentReadScopes'
  | 'assignmentWriteScopes'
  | 'batchReadScopes'
  | 'batchWriteScopes'
  | 'organizationReadScopes'
  | 'organizationWriteScopes'
  | 'gradeReadScopes'
  | 'gradeWriteScopes'
  | 'semesterReadScopes'
  | 'semesterWriteScopes';

export type ResolvedSecurityFilters = Partial<{
  [K in ResolvedSecurityFilterKey]: ResolvedSecurityFilter;
}>;

declare global {
  namespace Express {
    interface Request {
      securityFilters?: ResolvedSecurityFilters;
    }
  }
}
