import { Action, Actions } from './Actions.js';
import { DataAccessScope, DataAccessScopes } from './DataAccessScopes.js';

export type Permission = {
  scopes: DataAccessScope[];
};

export type PermissionSet = {
  [key in Action]?: Permission;
};

export const PermissionSets: Record<string, PermissionSet> = {
  Admin: {
    [Actions.user.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.user.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.student.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.student.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.organization.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.organization.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.program.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.program.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.course.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.course.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.module.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.module.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.batch.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.batch.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.assignment.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.assignment.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.semester.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.semester.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.submission.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.grade.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.grade.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.content.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.content.write]: { scopes: [DataAccessScopes.admin.id] }
  },

  Mentor: {
    [Actions.user.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.organization.read]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.student.read]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.student.write]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.submission.read]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.grade.read]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.grade.write]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.course.read]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.program.read]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.module.read]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.assignment.read]: { scopes: [DataAccessScopes.supervisor.id] },
    [Actions.batch.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.semester.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.content.read]: { scopes: [DataAccessScopes.supervisor.id] }
  },

  DataManagementTeam: {
    [Actions.user.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.student.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.student.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.organization.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.organization.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.program.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.program.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.course.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.course.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.module.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.module.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.batch.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.batch.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.assignment.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.assignment.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.semester.read]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.semester.write]: { scopes: [DataAccessScopes.admin.id] },
    [Actions.content.read]: { scopes: [DataAccessScopes.admin.id] }
  },

  Faculty: {
    [Actions.user.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.organization.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.student.read]: {
      scopes: [DataAccessScopes.organization.id, DataAccessScopes.program.id]
    },
    [Actions.submission.read]: {
      scopes: [DataAccessScopes.organization.id, DataAccessScopes.program.id]
    },
    [Actions.grade.read]: {
      scopes: [DataAccessScopes.organization.id, DataAccessScopes.program.id]
    },
    [Actions.course.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.program.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.module.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.assignment.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.content.read]: {
      scopes: [DataAccessScopes.organization.id, DataAccessScopes.program.id]
    }
  },

  OrgLeader: {
    [Actions.user.read]: { scopes: [DataAccessScopes.organization.id] },
    [Actions.organization.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.student.read]: { scopes: [DataAccessScopes.organization.id] },
    [Actions.submission.read]: { scopes: [DataAccessScopes.organization.id] },
    [Actions.grade.read]: { scopes: [DataAccessScopes.organization.id] },
    [Actions.course.read]: { scopes: [DataAccessScopes.organization.id] },
    [Actions.program.read]: { scopes: [DataAccessScopes.organization.id] },
    [Actions.module.read]: { scopes: [DataAccessScopes.organization.id] },
    [Actions.assignment.read]: { scopes: [DataAccessScopes.organization.id] },
    [Actions.content.read]: { scopes: [DataAccessScopes.organization.id] }
  },

  // Grader: {
  //   [Actions.user.read]: { scopes: [DataAccessScopes.self.id] },
  //   [Actions.student.read]: { scopes: [DataAccessScopes.organization.id] },
  //   [Actions.submission.read]: { scopes: [DataAccessScopes.organization.id] }
  // },

  Student: {
    [Actions.user.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.student.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.student.write]: { scopes: [DataAccessScopes.self.id] },
    [Actions.organization.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.program.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.course.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.module.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.batch.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.assignment.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.semester.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.submission.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.submission.write]: { scopes: [DataAccessScopes.self.id] },
    [Actions.grade.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.rmnotes.read]: { scopes: [DataAccessScopes.self.id] },
    [Actions.rmnotes.write]: { scopes: [DataAccessScopes.self.id] },
    [Actions.content.read]: { scopes: [DataAccessScopes.self.id] }
  }
} as const;

export type PermissionSetName = keyof typeof PermissionSets;
