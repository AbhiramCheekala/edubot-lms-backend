import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { BatchInsert } from '../db/schema/batch.schema.js';
import { PaginationParams, SearchKey } from '../db/schema/commonTypes.js';
import {
  Semester,
  SemesterInsert,
  SemesterTable,
  SemesterWithBatches
} from '../db/schema/semester.schema.js';
import { insertBatch } from '../models/batch.model.js';
import {
  findSemesterByField,
  insertSemester,
  queryAllSemesters,
  querySemesterByYearMonthOrgCombo
} from '../models/semester.model.js';

export async function createSemester(
  {
    semester,
    batches
  }: {
    semester: SemesterInsert;
    batches: BatchInsert[];
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SemesterWithBatches> {
  // const existingUser = await getUserByEmail(email);
  // if (existingUser?.length) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  // }
  // TODO handle key constraint errors?
  const semesterObj: Semester = await insertSemester(
    {
      ...semester
    },
    transactionClient
  );
  const semesterId = semesterObj.semesterId;
  const semesterWithBatches: SemesterWithBatches = {
    ...semesterObj,
    batches: []
  };
  for (const batch of batches) {
    const batchObj = await insertBatch(
      {
        ...batch,
        semesterId
      },
      transactionClient
    );
    semesterWithBatches.batches.push(batchObj);
  }
  return semesterWithBatches;
}

export async function findSemesterById(
  { semesterId, includeBatches }: { semesterId: string; includeBatches: boolean },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SemesterWithBatches> {
  const semester = await findSemesterByField({
    transactionClient,
    findParams: {
      findValue: semesterId,
      findColumn: 'semesterId'
    },
    includeBatches
  });
  return semester;
}

export async function findSemesterByYearMonthOrgCombo(
  {
    year,
    month,
    orgId,
    includeBatches
  }: {
    year: number;
    month: number;
    orgId: string;
    includeBatches: boolean;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<SemesterWithBatches> {
  const semester = await querySemesterByYearMonthOrgCombo({
    year,
    month,
    orgId,
    transactionClient,
    includeBatches
  });
  return semester;
}

// const queryOrganizations = async (
//   options: {
//     limit?: number;
//     page?: number;
//     sortBy?: OrgSortColumn;
//     sortType?: SortType;
//     searchColumn?: OrganizationSearchColumn;
//     searchKey?: SearchKey;
//     orgPermissionScope?: DataAccessScope;
//     currentUserRef?: User['id'];
//   },
//   keys?: Array<OrgKey>,
//   transactionClient: NodePgDatabase<Schema> = db
// ): Promise<FindAllResults<OrganizationPartial>> => {
//   const page = options.page ?? 1;
//   const limit = options.limit ?? 10;
//   const offset = (page - 1) * limit;
//   const paginationParams = { limit, offset };
//   const sortColumn = options.sortBy;
//   const sortType = options.sortType;
//   const sortParams = sortColumn && sortType ? { sortColumn, sortType } : undefined;
//   const searchColumn = options.searchColumn;
//   const searchKey = options.searchKey;
//   const searchParams = searchColumn && searchKey ? { searchColumn, searchKey } : undefined;
//   const securityFilter =
//     options.orgPermissionScope && options.currentUserRef
//       ? { scope: options.orgPermissionScope, context: { userRef: options.currentUserRef } }
//       : undefined;
//   const organizations = await findAllOrganizations({
//     transactionClient,
//     findParams: {
//       searchParams,
//       paginationParams,
//       sortParams,
//       securityFilter,
//       selectColumns: keys?.reduce(
//         (acc: Record<OrgKey, PgColumn>, key) => {
//           acc[key] = OrganizationTable[key];
//           return acc;
//         },
//         {} as Record<OrgKey, PgColumn>
//       )
//     }
//   });
//   return organizations;
// };

export async function findAllSemesters(
  {
    limit,
    page,
    sortBy,
    sortType,
    searchColumn,
    searchKey,
    includeBatches
  }: {
    limit?: number;
    page?: number;
    sortBy?: 'year' | 'month' | 'orgName' | 'year-month';
    sortType?: 'ASC' | 'DESC';
    searchColumn?: 'year' | 'month' | 'orgName';
    searchKey?: SearchKey;
    includeBatches: boolean;
  },
  transactionClient: NodePgDatabase<Schema> = db,
  keys?: Array<keyof Semester>
): Promise<SemesterWithBatches[]> {
  page = page ?? 1;
  limit = limit ?? 10;
  const offset = (page - 1) * limit;
  const paginationParams: PaginationParams = { limit, offset };
  const sortParams = sortBy && sortType ? { sortColumn: sortBy, sortType } : undefined;
  const searchParams = searchColumn && searchKey ? { searchColumn, searchKey } : undefined;
  const securityFilter = undefined;
  let selectColumns: Record<keyof Semester, PgColumn> | undefined;
  if (keys) {
    selectColumns = keys.reduce(
      (acc: Record<keyof Semester, PgColumn>, key) => {
        acc[key] = SemesterTable[key];
        return acc;
      },
      {} as Record<keyof Semester, PgColumn>
    );
  }
  const semesters = await queryAllSemesters({
    transactionClient,
    findParams: {
      searchParams,
      paginationParams,
      sortParams,
      securityFilter,
      selectColumns
    },
    includeBatches
  });
  return semesters as SemesterWithBatches[];
}

// const getOrganizationById = async (
//   options: {
//     orgPermissionScope?: DataAccessScope;
//     currentUserRef?: Organization['id'];
//     findValue: typeof OrganizationTable.id;
//   },
//   keys?: Array<OrgKey>,
//   transactionClient: NodePgDatabase<Schema> = db
// ): Promise<OrganizationPartial> => {
//   const findValue = options.findValue;
//   const securityFilter =
//     options.orgPermissionScope && options.currentUserRef
//       ? { scope: options.orgPermissionScope, context: { userRef: options.currentUserRef } }
//       : undefined;
//   const org = await findOrganizationByField({
//     transactionClient,
//     findParams: {
//       findValue,
//       findColumn: 'id',
//       securityFilter,
//       selectColumns: keys?.reduce(
//         (acc: Record<OrgKey, PgColumn>, key) => {
//           acc[key] = OrganizationTable[key];
//           return acc;
//         },
//         {} as Record<OrgKey, PgColumn>
//       )
//     }
//   });
//   return org as OrganizationPartial;
// };

// const updateOrgById = async (
//   orgId: string,
//   transactionClient: NodePgDatabase<Schema> = db,
//   {
//     org
//   }: {
//     org: Omit<OrganizationInsert, 'password' | 'updatedAt'>;
//   }
// ): Promise<Organization> => {
//   // const user = await getUserById(userId, ['id', 'email', 'name']);
//   // if (!user) {
//   //   throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
//   // }
//   // if (updateBody.email && (await getUserByEmail(updateBody.email as string))) {
//   //   throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
//   // }
//   // TODO check if token has access to the user
//   const updatedOrg = updateOrganization(orgId, transactionClient, org);
//   return updatedOrg;
// };
