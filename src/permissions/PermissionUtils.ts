// import { Action } from './Actions.js';
// import { DataAccessScopePrecidence } from './DataAccessScopes.js';
// import { Permission } from './Permissions.js';
// import { PermissionSet } from './PermissionSets.js';

// export const getPermissionsForAction = (
//   permissionSet: PermissionSet = [],
//   action: Action
// ): Permission[] => {
//   return permissionSet.filter((permission) => permission.action === action);
// };

// export const findEffectivePermissionForAction = (
//   permissionSet: PermissionSet = [],
//   action: Action
// ): Permission | undefined => {
//   const permissionsForAction = getPermissionsForAction(permissionSet, action);
//   const scopes = permissionsForAction.map((permission: Permission) => permission.scope);
//   const effectivScope = DataAccessScopePrecidence.find((scope) => scopes.includes(scope));
//   if (!effectivScope) {
//     return;
//   }
//   return { scope: effectivScope, action };
// };
import { Permission, PermissionSet } from './PermissionSets.js';
import { DataAccessScope } from './DataAccessScopes.js';
import { Action } from './Actions.js';

export function hasAnyScope(permission: Permission, ...scopes: DataAccessScope[]): boolean {
  return permission.scopes.some((scope) => scopes.includes(scope));
}

export function hasAllScopes(permission: Permission, ...scopes: DataAccessScope[]): boolean {
  return scopes.every((scope) => permission.scopes.includes(scope));
}

export function getPermissionScopes(
  userPermissions: PermissionSet,
  action: Action
): DataAccessScope[] {
  return userPermissions[action]?.scopes || [];
}

export function hasPermission(
  userPermissions: PermissionSet,
  action: Action,
  ...scopes: DataAccessScope[]
): boolean {
  const permission = userPermissions[action];
  return permission ? hasAnyScope(permission, ...scopes) : false;
}
