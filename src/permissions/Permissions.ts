// import { Action, Actions } from './Actions.js';
// import { DataAccessScope, DataAccessScopes } from './DataAccessScopes.js';

// export const Permissions: PermissionCollection = {
//   user: {
//     self: {
//       view: {
//         action: Actions.user.view,
//         scope: DataAccessScopes.self
//       },
//       edit: {
//         action: Actions.user.edit,
//         scope: DataAccessScopes.self
//       }
//     },
//     organization: {
//       view: {
//         action: Actions.user.view,
//         scope: DataAccessScopes.organization
//       },
//       edit: {
//         action: Actions.user.edit,
//         scope: DataAccessScopes.organization
//       }
//     },
//     all: {
//       view: {
//         action: Actions.user.view,
//         scope: DataAccessScopes.all
//       },
//       edit: {
//         action: Actions.user.edit,
//         scope: DataAccessScopes.all
//       }
//     }
//   }
// };

// export type Permission = {
//   action: Action;
//   scope: DataAccessScope;
// };

// export type PermissionGroup = { [key: string]: Permission };

// export type PermissionScopeGroup = { [key: string]: PermissionGroup };

// export type PermissionCollection = { [key: string]: PermissionScopeGroup };
