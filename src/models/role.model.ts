import { and, eq, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { Role, RoleTable } from '../db/schema/index.js';
import { SearchParamsOld } from '../db/schema/commonTypes.js';

export async function findRoleByField({
  transactionClient = db,
  findParams
}: {
  transactionClient: NodePgDatabase<Schema>;
  findParams: { searchParams: SearchParamsOld<keyof Role> };
}): Promise<Role | null> {
  const searchParams = findParams.searchParams;
  const filters: SQL[] = [];
  const queryWithoutWhere = transactionClient.select().from(RoleTable).limit(1).$dynamic();

  if (searchParams) {
    switch (searchParams.searchColumn) {
      case 'roleName':
        if (searchParams.searchKey.stringValue)
          filters.push(eq(RoleTable.roleName, searchParams.searchKey.stringValue));
        break;
      case 'id':
        if (searchParams.searchKey.stringValue)
          filters.push(eq(RoleTable.id, searchParams.searchKey.stringValue));
        break;
    }
  }
  const query = queryWithoutWhere.where(and(...filters));
  const roles = await query;
  return roles[0];
}

export async function findAllRoles({
  transactionClient = db,
  removeStudent = true
}: {
  transactionClient: NodePgDatabase<Schema>;
  removeStudent?: boolean;
}): Promise<Role[]> {
  const query = transactionClient.select().from(RoleTable);
  const roles = await query;
  return removeStudent ? roles?.filter((role) => role.roleName !== 'Student') : roles;
}
