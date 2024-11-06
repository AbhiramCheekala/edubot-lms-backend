import { db } from '../src/db/db.js'; // Assuming you have a database connection
import {
  OrganizationTable,
  OrgUserMapTable,
  RoleTable,
  TokenTable,
  UserTable,
  StudentTable
} from '../src/db/schema/index.js';
import { BatchTable } from '../src/db/schema/batch.schema.js';
import { LoginTable } from '../src/db/schema/login.schema.js';
import { SemesterTable } from '../src/db/schema/semester.schema.js';

export async function deleteAllRoles() {
  await db.delete(RoleTable).execute();
}

export async function deleteAllUsers() {
  await db.delete(UserTable).execute();
}

export async function deleteAllOrgs() {
  await db.delete(OrganizationTable).execute();
}

export async function deleteAllUserOrgMaps() {
  await db.delete(OrgUserMapTable).execute();
}

export async function deleteAllSemesters() {
  await db.delete(SemesterTable).execute();
}

export async function deleteAllBatches() {
  await db.delete(BatchTable).execute();
}

export async function deleteAllTokens() {
  await db.delete(TokenTable).execute();
}

export async function deleteAllLogin() {
  await db.delete(LoginTable).execute();
}

export async function deleteAllStudents() {
  await db.delete(StudentTable).execute();
}

export async function truncateDatabase() {
  await deleteAllTokens();
  await deleteAllUserOrgMaps();
  await deleteAllStudents();
  await deleteAllBatches();
  await deleteAllSemesters();
  await deleteAllOrgs();
  await deleteAllUsers();
  await deleteAllLogin();
  await deleteAllRoles();
}
