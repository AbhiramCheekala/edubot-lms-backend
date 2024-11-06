export const PermissionSetNames = {
  mentor: 'Mentor',
  admin: 'Admin',
  dataManagementTeam: 'DataManagementTeam',
  faculty: 'Faculty',
  orgLeader: 'OrgLeader',
  // grader: 'Grader',
  student: 'Student'
} as const;

export type PermissionSet = keyof typeof PermissionSetNames;
export type PermissionSetName = (typeof PermissionSetNames)[PermissionSet];
