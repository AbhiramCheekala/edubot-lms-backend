import { pgEnum } from 'drizzle-orm/pg-core';
import { TokenTypes } from '../../constants/index.js';
import { PermissionSetNames } from '../../constants/PermissionSetNames.js';
import { PlatformTypes } from '../../constants/PlatformTypes.constants.js';

export const TokenType = pgEnum('token_type', Object.values(TokenTypes) as [string, ...string[]]);
export const PermissionSetName = pgEnum(
  'permission_set_name',
  Object.values(PermissionSetNames) as [string, ...string[]]
);
export const AccountType = pgEnum('account_type', ['student', 'user']);
export const ModuleSectionType = pgEnum('module_section_type', [
  'readingMaterial',
  'assignment',
  'links'
]);
export const ContentType = pgEnum('content_type', ['file', 'link']);
export const SubmissionStatus = pgEnum('submission_status', ['submitted', 'pending', 'graded']);
export const PlatformTypeDbEnum = pgEnum(
  'platform_type',
  Object.values(PlatformTypes) as [string, ...string[]]
);
export type ModuleSectionTypes = 'readingMaterial' | 'assignment' | 'links';
export type SubmissionStatus = 'submitted' | 'pending' | 'graded';
