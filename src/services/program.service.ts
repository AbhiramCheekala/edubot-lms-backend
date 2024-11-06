import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import {
  Program,
  ProgramInsert,
  ProgramJoined,
  ProgramKey,
  ProgramPartial,
  ProgramSearchColumn,
  ProgramSortColumn,
  ProgramTable
} from '../db/schema/program.schema.js';
import {
  insertProgram,
  queryAllPrograms,
  queryProgramByField,
  updateProgram
} from '../models/program.model.js';
import { addCoursesToProgram } from '../models/programCourseMap.model.js';
import {
  deleteAllStudentMappingsForProgram,
  deleteProgramMapping,
  insertStudentProgramMapping,
  queryStudentsInProgram
} from '../models/studentProgramMap.model.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';

const findAllPrograms = async (
  options: {
    limit?: number;
    page?: number;
    includeCourseCount?: boolean;
    includeCourses: boolean;
    searchParams?: ParsedFilter<ProgramSearchColumn>[];
    sortParams?: ParsedSort<ProgramSortColumn>[];
    securityFilters?: ResolvedSecurityFilters;
  },
  keys?: Array<ProgramKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<FindAllResults<ProgramPartial>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;

  const paginationParams = { limit, offset };
  const { sortParams, searchParams } = options;

  const selectColumns = keys?.reduce(
    (acc, key) => {
      acc[key] = ProgramTable[key];
      return acc;
    },
    {} as Record<ProgramKey, PgColumn>
  );

  const programs = await queryAllPrograms({
    transactionClient,
    findParams: {
      searchParams,
      paginationParams,
      sortParams,
      securityFilters: options.securityFilters,
      selectColumns
    },
    includeCourseCount: options.includeCourseCount,
    includeCourses: options.includeCourses
  });

  return programs;
};

const findProgramByField = async (
  options: {
    findValue: Program['programId'];
    includeCourseCount: boolean;
    includeCourses: boolean;
    securityFilters?: ResolvedSecurityFilters;
  },
  transactionClient: NodePgDatabase<Schema> = db,
  keys?: Array<ProgramKey>
): Promise<ProgramJoined | null> => {
  const findValue = options.findValue;
  const program = await queryProgramByField({
    transactionClient,
    findParams: {
      findValue,
      findColumn: 'programId',
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<ProgramKey, PgColumn>, key) => {
          acc[key] = ProgramTable[key];
          return acc;
        },
        {} as Record<ProgramKey, PgColumn>
      )
    },
    includeCourseCount: options.includeCourseCount,
    includeCourses: options.includeCourses
  });
  return program as ProgramJoined;
};

const createProgram = async (
  {
    Program
  }: {
    Program: Omit<ProgramInsert, 'updatedAt'>;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ProgramPartial> => {
  return await insertProgram(transactionClient, {
    ...Program,
    updatedAt: ''
  });
};

const updateProgramById = async (
  programId: string,
  transactionClient: NodePgDatabase<Schema> = db,
  {
    program
  }: {
    program: Partial<Omit<ProgramInsert, 'updatedAt'>>;
  }
): Promise<ProgramPartial> => {
  const updatedProgram = await updateProgram(programId, transactionClient, program);
  return updatedProgram;
};

const mapCoursesToProgram = async (
  programId: string,
  courseIds: string[],
  transactionClient: NodePgDatabase<Schema>
): Promise<void> => {
  for (let i = 0; i < courseIds.length; i++) {
    const courseId = courseIds[i];
    await addCoursesToProgram({ programId, courseId, position: i + 1 }, transactionClient);
  }
};

// Adding multiple students to a program
export async function addStudentsToProgram(
  params: { studentIds: string[]; programId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const studentId of params.studentIds) {
    await insertStudentProgramMapping(
      { studentId, programId: params.programId },
      transactionClient
    );
  }
}

// Removing multiple students from a program
export async function removeStudentsFromProgram(
  params: { studentIds: string[]; programId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const studentId of params.studentIds) {
    await deleteProgramMapping({ studentId, programId: params.programId }, transactionClient);
  }
}

// Updating student mappings for a program
export async function updateStudentsInProgram(
  params: { studentIds: string[]; programId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  // First, delete all existing mappings for the program
  await deleteAllStudentMappingsForProgram(params.programId, transactionClient);

  // Then, insert the new mappings
  for (const studentId of params.studentIds) {
    await insertStudentProgramMapping(
      { studentId, programId: params.programId },
      transactionClient
    );
  }
}

export async function findStudentsForProgram(
  programId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<any[]> {
  return await queryStudentsInProgram(programId, transactionClient);
}

export default {
  findAllPrograms,
  findProgramByField,
  createProgram,
  updateProgramById,
  mapCoursesToProgram
};
