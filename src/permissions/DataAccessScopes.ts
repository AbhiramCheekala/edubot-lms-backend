// export const DataAccessScopes = {
//   self: {
//     identifier: 'self'
//   },
//   supervisor: {
//     identifier: 'supervisor'
//   },
//   organization: {
//     identifier: 'organization'
//   },
//   all: {
//     identifier: 'all'
//   }
// } as const;

// export const DataAccessScopePrecidence: DataAccessScope[] = [
//   'all',
//   'organization',
//   'supervisor',
//   'self'
// ];

// export type DataAccessScope = keyof typeof DataAccessScopes;
// export type DataAccessScopeValue = (typeof DataAccessScopes)[DataAccessScope];

// export const DataAccessScopes = {
//   self: 'self',
//   supervisor: 'supervisor',
//   organization: 'organization',
//   admin: 'admin'
// } as const;

// export type DataAccessScope = (typeof DataAccessScopes)[keyof typeof DataAccessScopes];

export const DataAccessScopes = {
  self: {
    id: 'self',
    label: 'Self',
    description: 'Access to own data only'
  },
  supervisor: {
    id: 'supervisor',
    label: 'Supervisor',
    description: "Access to supervised users'/students' data"
  },
  program: {
    id: 'program',
    label: 'Program',
    description: 'Access to all data within the program'
  },
  organization: {
    id: 'organization',
    label: 'Organization',
    description: 'Access to all data within the organization'
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    description: 'Full access to all data'
  }
} as const;

export type DataAccessScope = (typeof DataAccessScopes)[keyof typeof DataAccessScopes]['id'];
export type DataAccessScopeObject = (typeof DataAccessScopes)[keyof typeof DataAccessScopes];
