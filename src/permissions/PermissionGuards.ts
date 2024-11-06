import { Action } from './Actions.js';
import { DataAccessScope } from './DataAccessScopes.js';
import { PermissionSet } from './PermissionSets.js';
import { hasPermission } from './PermissionUtils.js';

export type PermissionCheck = {
  action: Action;
  scopes: DataAccessScope[];
};

export type AndRule = {
  type: 'and';
  checks: PermissionCheck[];
};

export type OrRule = {
  type: 'or';
  checks: PermissionCheck[];
};

export type PermissionRule = AndRule | OrRule;

export type PermissionGuard = {
  type: 'or';
  rules: PermissionRule[];
};

export function and(...checks: PermissionCheck[]): AndRule {
  return { type: 'and', checks };
}

export function or(...checks: PermissionCheck[]): OrRule {
  return { type: 'or', checks };
}

export function check(action: Action, ...scopes: DataAccessScope[]): PermissionCheck {
  return { action, scopes };
}

export function guard(...rules: PermissionRule[]): PermissionGuard {
  return { type: 'or', rules };
}

export function checkPermissionRule(permissionSet: PermissionSet, rule: PermissionRule): boolean {
  if (rule.type === 'and') {
    return rule.checks.every((check) =>
      hasPermission(permissionSet, check.action, ...check.scopes)
    );
  } else {
    // 'or'
    return rule.checks.some((check) => hasPermission(permissionSet, check.action, ...check.scopes));
  }
}

export function checkPermissionGuard(
  permissionSet: PermissionSet,
  guard: PermissionGuard
): boolean {
  return guard.rules.some((rule) => checkPermissionRule(permissionSet, rule));
}
