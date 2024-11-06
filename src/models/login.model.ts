import { eq, getTableColumns, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { Login, LoginInsert, LoginJoined, LoginTable } from '../db/schema/login.schema.js';
import { StudentTable } from '../db/schema/student.schema.js';
import { UserTable } from '../db/schema/user.schema.js';
import exclude from '../utils/exclude.js';

const studentInfoSQL = sql`
  CASE 
    WHEN "login"."account_type" = 'student' THEN 
      (SELECT json_build_object(
        'id', s.id,
        'givenStudentId', s.given_student_id,
        'name', s.name,
        'personalEmail', s.personal_email,
        'dateOfBirth', s.date_of_birth,
        'apsche', s.apsche,
        'gender', s.gender,
        'orgId', s.org_id,
        'batchId', s.batch_id,
        'joiningDate', s."joiningDate",
        'contactPhoneNumber', s.contact_phone_number,
        'isActive', s.is_active
      )
      FROM ${StudentTable} s
      WHERE s.login_id = "login"."login_id")
    ELSE NULL
  END
`;

const userInfoSQL = sql`
  CASE 
    WHEN "login"."account_type" = 'user' THEN 
      (SELECT json_build_object(
        'id', u.id,
        'givenUserId', u.given_user_id,
        'name', u.name,
        'joiningDate', u."joiningDate",
        'contactPhoneNumber', u.contact_phone_number,
        'isActive', u.is_active
      )
      FROM ${UserTable} u
      WHERE u.login_id = "login"."login_id")
    ELSE NULL
  END
`;

export async function queryLoginByFieldUnsafe(
  field: keyof Login,
  value: string,
  transactionClient: NodePgDatabase<Schema> = db,
  selectColumns?: Record<string, PgColumn>
): Promise<Partial<LoginJoined>> {
  selectColumns = selectColumns ?? getTableColumns(LoginTable);
  const query = transactionClient
    .select({ ...selectColumns, student: studentInfoSQL, user: userInfoSQL })
    .from(LoginTable)
    .where(eq(LoginTable[field], value))
    .limit(1);
  const result = await query;
  return result[0] as LoginJoined;
}

export async function queryLoginByField(
  field: keyof Login,
  value: string,
  transactionClient: NodePgDatabase<Schema> = db,
  selectColumns?: Record<string, PgColumn>
): Promise<Partial<LoginJoined>> {
  selectColumns = getSanatizedSelectColumns(selectColumns);
  const query = transactionClient
    .select({ ...selectColumns, student: studentInfoSQL, user: userInfoSQL })
    .from(LoginTable)
    .where(eq(LoginTable[field], value))
    .limit(1);
  const result = await query;
  return result[0] as LoginJoined;
}

export async function insertLogin(
  login: Omit<LoginInsert, 'updatedAt'>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Login> {
  const { role, email, passwordHash: password, accountType } = login;
  const [account] = await transactionClient
    .insert(LoginTable)
    .values({
      role,
      email,
      passwordHash: password,
      accountType,
      updatedAt: new Date().toISOString()
    })
    .returning(getSanatizedSelectColumns());
  return account as Login;
}

export async function updateLogin(
  column: Extract<keyof Login, 'loginId' | 'email'>,
  key: string,
  login: Partial<LoginInsert>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Login> {
  const [updatedLogin] = await transactionClient
    .update(LoginTable)
    .set({ ...login, updatedAt: new Date().toISOString() })
    .where(eq(LoginTable[column], key))
    .returning(getSanatizedSelectColumns());
  return updatedLogin as Login;
}

function getSanatizedSelectColumns(
  selectColumns?: Record<string, PgColumn>
): Record<string, PgColumn> {
  return selectColumns
    ? exclude(selectColumns, ['updatedAt', 'createdAt', 'passwordHash'])
    : exclude(getTableColumns(LoginTable), ['updatedAt', 'createdAt', 'passwordHash']);
}
