import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { DataAccessScope } from '../permissions/DataAccessScopes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import { db, Schema } from '../db/db.js';
import { OrganizationTable, OrgKey, RoleKey, RoleTable, User } from '../db/schema/index.js';
import { Login, LoginKey, LoginTable } from '../db/schema/login.schema.js';
import {
  StudentInsert,
  StudentKey,
  StudentKeyFull,
  StudentPartial,
  StudentSearchColumn,
  StudentSortColumn,
  StudentTable
} from '../db/schema/student.schema.js';
import {
  disableStudent,
  insertStudent,
  queryAllStudents,
  queryStudentByField,
  updateStudent
} from '../models/student.model.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import {
  insertStudentProgramMapping,
  deleteProgramMapping,
  deleteAllProgramMappingsForStudent,
  queryProgramsForStudent
} from '../models/studentProgramMap.model.js';
import {
  deleteAllCourseMappingsForStudent,
  deleteCourseMapping,
  insertStudentCourseMapping,
  queryCoursesForStudent
} from '../models/studentCourseMap.model.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';

export async function createStudent({
  transactionClient = db,
  student
}: {
  transactionClient?: NodePgDatabase<Schema>;
  student: Omit<StudentInsert, 'updatedAt'>;
}): Promise<StudentPartial> {
  // TODO validate batch and org match
  return await insertStudent(student, transactionClient);
}

export async function findAllStudents(
  options: {
    limit?: number;
    page?: number;
    searchParams?: ParsedFilter<StudentSearchColumn>[];
    sortParams?: ParsedSort<StudentSortColumn>[];
    studentPermissionScope?: DataAccessScope;
    currentUserRef?: User['id'];
    includeOrg?: boolean;
    includeRole?: boolean;
    includeBatch?: boolean;
    includeMentor?: boolean;
    securityFilters?: ResolvedSecurityFilters;
  },
  keys?: Array<StudentKeyFull>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<FindAllResults<StudentPartial>> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;
  const paginationParams = { limit, offset };
  const sortParams = options.sortParams;
  const searchParams = options.searchParams;

  const selectColumns = keys ? paresSelectKeys(keys) : undefined;

  const students = await queryAllStudents({
    transactionClient,
    findParams: {
      paginationParams,
      searchParams,
      sortParams,
      securityFilters: options.securityFilters,
      selectColumns
    },
    includeBatch: options.includeBatch,
    includeOrg: options.includeOrg,
    includeRole: options.includeRole,
    includeMentor: options.includeMentor
  });
  return students;
}

export async function findStudentById(
  options: {
    securityFilters?: ResolvedSecurityFilters;
    findValue: User['id'];
    includeOrg?: boolean;
    includeRole?: boolean;
    includeBatch?: boolean;
    includeMentor?: boolean;
  },
  keys?: Array<StudentKeyFull>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<StudentPartial> {
  const findValue = options.findValue;

  const selectColumns = keys ? paresSelectKeys(keys) : undefined;

  const student = await queryStudentByField({
    transactionClient,
    findParams: {
      findValue,
      findColumn: 'studentId',
      securityFilters: options.securityFilters,
      selectColumns
    },
    joinOptions: {
      includeBatch: options.includeBatch,
      includeOrg: options.includeOrg,
      includeRole: options.includeRole,
      includeMentor: options.includeMentor
    }
  });
  return student as StudentPartial;
}

export async function findStudentByEmail(
  options: {
    securityFilters?: ResolvedSecurityFilters;
    findValue: Login['email'];
    includeOrg?: boolean;
    includeRole?: boolean;
    includeBatch?: boolean;
    includeMentor?: boolean;
  },
  keys?: Array<StudentKeyFull>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<StudentPartial> {
  const findValue = options.findValue;

  const selectColumns = keys ? paresSelectKeys(keys) : undefined;

  const student = await queryStudentByField({
    transactionClient,
    findParams: {
      findValue,
      findColumn: 'email',
      securityFilters: options.securityFilters,
      selectColumns
    },
    joinOptions: {
      includeBatch: options.includeBatch,
      includeOrg: options.includeOrg,
      includeRole: options.includeRole,
      includeMentor: options.includeMentor
    }
  });
  return student as StudentPartial;
}

export async function updateStudentById(
  studentId: string,
  {
    student
  }: {
    student: Partial<Omit<StudentInsert, 'updatedAt'>>;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<StudentPartial> {
  // Add the new fields to the list of updatable fields
  const updatableFields = [
    'name',
    'contactPhoneNumber',
    'isActive',
    'joiningDate',
    'givenStudentId',
    'orgId',
    'personalEmail',
    'dateOfBirth',
    'apsche',
    'batchId',
    'gender',
    'languagesKnown',
    'fullAddress',
    'linkedinUrl',
    'githubUrl',
    'educationHSCName',
    'educationHSCSubjectSpecialization',
    'educationHSCMentionYear',
    'educationUniversityOrCollege',
    'educationUniversityOrCollegeSubjectSpecialization',
    'educationUniversityOrCollegeSubject',
    'profilePicture'
  ];

  const updateData = Object.fromEntries(
    Object.entries(student).filter(([key]) => updatableFields.includes(key))
  );

  const updatedStudent = await updateStudent(studentId, updateData, transactionClient);
  return updatedStudent;
}

export async function disableStudentById(
  studentId: string,
  transactionClient: NodePgDatabase<Schema>
): Promise<StudentPartial> {
  const updatedStudent = await disableStudent(studentId, transactionClient);
  return updatedStudent;
}

function paresSelectKeys(keys: Array<StudentKeyFull>): Record<StudentKeyFull, PgColumn> {
  return keys?.reduce(
    (acc: Record<StudentKeyFull, PgColumn>, key) => {
      if (
        [
          'name',
          'studentId',
          'givenStudentId',
          'personalEmail',
          'dateOfBirth',
          'apsche',
          'gender',
          'isActive',
          'contactPhoneNumber',
          'orgId',
          'batchId',
          'joiningDate',
          'loginId'
        ].includes(key)
      ) {
        acc[key] = StudentTable[key as StudentKey];
      } else if (['email', 'loginId', 'accountType', 'role'].includes(key)) {
        acc[key] = LoginTable[key as LoginKey];
      } else if (['orgName', 'givenOrgId'].includes(key)) {
        acc[key] = OrganizationTable[key as OrgKey];
      } else if (['roleName', 'givenRoleId'].includes(key)) {
        acc[key] = RoleTable[key as RoleKey];
      }
      return acc;
    },
    {} as Record<StudentKeyFull, PgColumn>
  );
}

//to add a student to multiple  programs
export async function addStudentToPrograms(
  params: { studentId: string; programIds: string[] },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const programId of params.programIds) {
    await insertStudentProgramMapping(
      { studentId: params.studentId, programId },
      transactionClient
    );
  }
}

//to add a student to multiple courses
export async function addStudentToCourses(
  params: { studentId: string; courseIds: string[] },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const courseId of params.courseIds) {
    await insertStudentCourseMapping({ studentId: params.studentId, courseId }, transactionClient);
  }
}

// Remove multiple program mappings for a student
export async function removeStudentFromPrograms(
  studentId: string,
  programIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const programId of programIds) {
    await deleteProgramMapping({ studentId, programId }, transactionClient);
  }
}

// Remove multiple course mappings for a student
export async function removeStudentFromCourses(
  studentId: string,
  courseIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const courseId of courseIds) {
    await deleteCourseMapping({ studentId, courseId }, transactionClient);
  }
}

export async function findCoursesForStudent(
  studentId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<any[]> {
  return await queryCoursesForStudent(studentId, transactionClient);
}

export async function findProgramsForStudent(
  studentId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<any[]> {
  return await queryProgramsForStudent(studentId, transactionClient);
}

// Update course mappings for a student
export async function updateCoursesForStudent(
  studentId: string,
  courseIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await deleteAllCourseMappingsForStudent(studentId, transactionClient);
  for (const courseId of courseIds) {
    await insertStudentCourseMapping({ studentId, courseId }, transactionClient);
  }
}

// Update program mappings for a student
export async function updateProgramsForStudent(
  studentId: string,
  programIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await deleteAllProgramMappingsForStudent(studentId, transactionClient);
  for (const programId of programIds) {
    await insertStudentProgramMapping({ studentId, programId }, transactionClient);
  }
}
