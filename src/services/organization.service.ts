import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { db, Schema } from '../db/db.js';
import {
  Organization,
  OrganizationInsert,
  OrganizationPartial,
  OrganizationSearchColumn,
  OrganizationTable,
  OrgKey,
  OrgSortColumn,
  User
} from '../db/schema/index.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import {
  findAllOrganizations,
  findOrganizationByField,
  insertOrganization,
  updateOrganization
} from '../models/organization.model.js';
import { DataAccessScope } from '../permissions/DataAccessScopes.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';

const createOrganization = async (
  {
    Organization
  }: {
    Organization: Omit<OrganizationInsert, 'updatedAt'>;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Organization> => {
  // const existingUser = await getUserByEmail(email);
  // if (existingUser?.length) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  // }
  // TODO handle key constraint errors?
  return await insertOrganization(transactionClient, {
    ...Organization
  });
};

const queryOrganizations = async (
  options: {
    limit?: number;
    page?: number;
    searchParams?: ParsedFilter<OrganizationSearchColumn>[];
    sortParams?: ParsedSort<OrgSortColumn>[];
    orgPermissionScope?: DataAccessScope;
    currentUserRef?: User['id'];
    includeStudentCount?: boolean;
    includeBatchCount?: boolean;
    securityFilters?: ResolvedSecurityFilters;
  },
  keys?: Array<OrgKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<FindAllResults<OrganizationPartial>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;
  const paginationParams = { limit, offset };

  const sortParams = options.sortParams;
  const searchParams = options.searchParams;

  const securityFilter =
    options.orgPermissionScope && options.currentUserRef
      ? { scope: options.orgPermissionScope, context: { userRef: options.currentUserRef } }
      : undefined;
  const organizations = await findAllOrganizations({
    transactionClient,
    findParams: {
      searchParams,
      paginationParams,
      sortParams,
      securityFilter,
      selectColumns: keys?.reduce(
        (acc: Record<OrgKey, PgColumn>, key) => {
          acc[key] = OrganizationTable[key];
          return acc;
        },
        {} as Record<OrgKey, PgColumn>
      )
    },
    includeStudentCount: options.includeStudentCount,
    includeBatchCount: options.includeBatchCount,
    securityFilters: options.securityFilters
  });
  return organizations;
};

const getOrganizationById = async (
  options: {
    orgPermissionScope?: DataAccessScope;
    currentUserRef?: Organization['id'];
    findValue: Organization['id'];
    includeStudentCount?: boolean;
    includeBatchCount?: boolean;
    securityFilters?: ResolvedSecurityFilters;
  },
  keys?: Array<OrgKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<OrganizationPartial | null> => {
  const findValue = options.findValue;
  const securityFilter =
    options.orgPermissionScope && options.currentUserRef
      ? { scope: options.orgPermissionScope, context: { userRef: options.currentUserRef } }
      : undefined;
  const org = await findOrganizationByField({
    transactionClient,
    findParams: {
      findValue,
      findColumn: 'id',
      securityFilter,
      selectColumns: keys?.reduce(
        (acc: Record<OrgKey, PgColumn>, key) => {
          acc[key] = OrganizationTable[key];
          return acc;
        },
        {} as Record<OrgKey, PgColumn>
      )
    },
    joinOptions: {
      includeStudentCount: options.includeStudentCount,
      includeBatchCount: options.includeBatchCount
    },
    securityFilters: options.securityFilters
  });
  return org;
};

const updateOrgById = async (
  orgId: string,
  transactionClient: NodePgDatabase<Schema> = db,
  {
    org
  }: {
    org: Omit<OrganizationInsert, 'password' | 'updatedAt'>;
  }
): Promise<Organization> => {
  // const user = await getUserById(userId, ['id', 'email', 'name']);
  // if (!user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  // }
  // if (updateBody.email && (await getUserByEmail(updateBody.email as string))) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  // }
  // TODO check if token has access to the user
  const updatedOrg = updateOrganization(orgId, transactionClient, org);
  return updatedOrg;
};

export default {
  queryOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrgById
};
