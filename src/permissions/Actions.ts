// export const Actions = {
//   user: {
//     view: 'user:view',
//     edit: 'user:edit'
//   },
//   organziation: {
//     view: 'organization:view',
//     edit: 'organization:edit'
//   },
//   role: {
//     view: 'role:view',
//     edit: 'role:edit'
//   }
// } as const;

// export type Action = string;
// export type ActionValue = Action | NestedActions;
// export interface NestedActions {
//   [key: string]: ActionValue;
// }

export const Actions = {
  user: {
    read: 'user:read',
    write: 'user:write'
    // delete: 'user:delete'
  },
  student: {
    read: 'student:read',
    write: 'student:write'
    // delete: 'student:delete'
  },
  organization: {
    read: 'organization:read',
    write: 'organization:write'
    // delete: 'organization:delete'
  },
  program: {
    read: 'program:read',
    write: 'program:write'
    // delete: 'program:delete'
  },
  course: {
    read: 'course:read',
    write: 'course:write'
    // delete: 'course:delete'
  },
  module: {
    read: 'module:read',
    write: 'module:write'
    // delete: 'module:delete'
  },
  batch: {
    read: 'batch:read',
    write: 'batch:write'
    // delete: 'batch:delete'
  },
  assignment: {
    read: 'assignment:read',
    write: 'assignment:write'
    // delete: 'assignment:delete'
  },
  semester: {
    read: 'semester:read',
    write: 'semester:write'
    // delete: 'semester:delete'
  },
  submission: {
    read: 'submission:read',
    write: 'submission:write'
    // grade: 'submission:grade'
  },
  grade: {
    read: 'grade:read',
    write: 'grade:write'
    // grade: 'grade:grade'
  },
  rmnotes: {
    read: 'rmnotes:read',
    write: 'rmnotes:write'
    // grade: 'rmnotes:grade'
  },
  content: {
    read: 'content:read',
    write: 'content:write'
    // grade: 'content:grade'
  }
  // dataManagement: {
  //   import: 'data:import',
  //   export: 'data:export'
  // }
} as const;

// export type Action =
//   (typeof Actions)[keyof typeof Actions][keyof (typeof Actions)[keyof typeof Actions]];
// export type Action =
//   (typeof Actions)[keyof typeof Actions][keyof (typeof Actions)[keyof typeof Actions]];
// type ActionCategories = typeof Actions;
// type ActionCategory = ActionCategories[keyof ActionCategories];
// export type Action = ActionCategory[keyof ActionCategory];
type ValueOf<T> = T[keyof T];
export type Action = ValueOf<{
  [K in keyof typeof Actions]: ValueOf<(typeof Actions)[K]>;
}>;
