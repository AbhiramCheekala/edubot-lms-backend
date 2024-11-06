import { NodePgDatabase } from 'drizzle-orm/node-postgres';
// import httpStatus from 'http-status';
// import { QueryResult } from 'pg';
import { db, Schema } from '../db/db.js';
import { Role } from '../db/schema/index.js';
import { findAllRoles, findRoleByField } from '../models/role.model.js';

const queryRoles = async (transactionClient: NodePgDatabase<Schema> = db): Promise<Role[]> => {
  const roles = await findAllRoles({
    transactionClient
  });
  return roles;
};

const getRoleById = async (
  options: {
    roleId: string;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Role> => {
  const roleId = options.roleId;
  const user = await findRoleByField({
    transactionClient,
    findParams: {
      searchParams: {
        searchColumn: 'id',
        searchKey: { stringValue: roleId }
      }
    }
  });
  return user as Role;
};

export const getRoleByName = async (
  options: {
    roleName: string;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Role> => {
  const roleName = options.roleName;
  const user = await findRoleByField({
    transactionClient,
    findParams: {
      searchParams: {
        searchColumn: 'roleName',
        searchKey: { stringValue: roleName }
      }
    }
  });
  return user as Role;
};

export default {
  queryRoles,
  getRoleById
};
