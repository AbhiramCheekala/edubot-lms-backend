import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { db, Schema } from '../db/db.js';
import { FindAllResults } from '../db/schema/commonTypes.js';
import {
  CourseInsert,
  CourseKey,
  CoursePartial,
  CourseSearchColumn,
  CourseSortColumn,
  CourseTable
} from '../db/schema/course.schema.js';
import {
  insertCourse,
  queryAllCourses,
  queryCourseByField,
  updateCourse
} from '../models/course.model.js';
import {
  deleteAllModulesForCourse,
  deleteCourseModuleMapping,
  insertCourseModuleMapping,
  queryLastModulePositionForCourse
} from '../models/courseModuleMapper.model.js';
import {
  deleteAllStudentMappingsForCourse,
  deleteCourseMapping,
  insertStudentCourseMapping,
  queryStudentsInCourse
} from '../models/studentCourseMap.model.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';
import { ParsedFilter, ParsedSort } from '../utils/helpers/parseFindAllQuery.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

const findAllCourses = async (
  options: {
    limit?: number;
    page?: number;
    searchParams?: ParsedFilter<CourseSearchColumn>[];
    sortParams?: ParsedSort<CourseSortColumn>[];
    securityFilters?: ResolvedSecurityFilters;
    includeModuleCount?: boolean;
    includeModules?: boolean;
    onlyDangling?: boolean;
    markDangling?: boolean;
  },
  keys?: Array<CourseKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<FindAllResults<CoursePartial>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const offset = (page - 1) * limit;
  const paginationParams = { limit, offset };
  const joinOptions = {
    includeModuleCount: options.includeModuleCount ?? false,
    includeModules: options.includeModules ?? false
  };
  const sortParams = options.sortParams;
  const searchParams = options.searchParams;

  const courses = await queryAllCourses({
    transactionClient,
    findParams: {
      searchParams,
      paginationParams,
      sortParams,
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<CourseKey, PgColumn>, key) => {
          acc[key] = CourseTable[key];
          return acc;
        },
        {} as Record<CourseKey, PgColumn>
      )
    },
    joinOptions,
    onlyDangling: options.onlyDangling,
    markDangling: options.markDangling
  });

  return courses;
};

const findCourseByField = async (
  options: {
    findValue: string;
    includeModuleCount?: boolean;
    includeModules?: boolean;
    securityFilters?: ResolvedSecurityFilters;
  },
  keys?: Array<CourseKey>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<CoursePartial | null> => {
  const findValue = options.findValue;
  const joinOptions = {
    includeModuleCount: options.includeModuleCount ?? false,
    includeModules: options.includeModules ?? false
  };

  const course = await queryCourseByField({
    transactionClient,
    findParams: {
      findValue,
      findColumn: 'courseId',
      securityFilters: options.securityFilters,
      selectColumns: keys?.reduce(
        (acc: Record<CourseKey, PgColumn>, key) => {
          acc[key] = CourseTable[key];
          return acc;
        },
        {} as Record<CourseKey, PgColumn>
      )
    },
    joinOptions
  });
  return course;
};

const createCourse = async (
  {
    course,
    modules
  }: {
    course: Omit<CourseInsert, 'updatedAt'>;
    modules: string[];
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<CoursePartial> => {
  // const existingUser = await getUserByEmail(email);
  // if (existingUser?.length) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  // }
  // TODO handle key constraint errors?
  const newCourse = await insertCourse(transactionClient, {
    ...course,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await addModuleMappings({ moduleIds: modules, courseId: newCourse.courseId }, transactionClient);
  return newCourse as CoursePartial;
};

const modifyCourseById = async (
  courseId: string,
  transactionClient: NodePgDatabase<Schema> = db,
  {
    course,
    modules
  }: {
    course: Partial<Omit<CourseInsert, 'updatedAt'>>;
    modules: string[];
  }
): Promise<CoursePartial> => {
  // const user = await getUserById(userId, ['id', 'email', 'name']);
  // if (!user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  // }
  // if (updateBody.email && (await getUserByEmail(updateBody.email as string))) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  // }
  // TODO check if token has access to the user
  const updatedCourse = await updateCourse(courseId, transactionClient, course);
  if (modules && Array.isArray(modules)) {
    await updateModuleMappings({ moduleIds: modules, courseId }, transactionClient);
  }
  return { updatedCourse, modules } as CoursePartial;
};

// Adding students to a course
export async function addStudentsToCourse(
  params: { studentIds: string[]; courseId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const studentId of params.studentIds) {
    await insertStudentCourseMapping({ studentId, courseId: params.courseId }, transactionClient);
  }
}

// Removing students from a course
export async function removeStudentsFromCourse(
  params: { studentIds: string[]; courseId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (const studentId of params.studentIds) {
    await deleteCourseMapping({ studentId, courseId: params.courseId }, transactionClient);
  }
}

// Updating student mappings for a course
export async function updateStudentsInCourse(
  params: { studentIds: string[]; courseId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  // First, delete all existing mappings for the course
  await deleteAllStudentMappingsForCourse(params.courseId, transactionClient);

  // Then, insert the new mappings
  for (const studentId of params.studentIds) {
    await insertStudentCourseMapping({ studentId, courseId: params.courseId }, transactionClient);
  }
}

export async function addModuleMappings(
  params: { moduleIds: string[]; courseId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  const lastPosition =
    (await queryLastModulePositionForCourse(params.courseId, transactionClient)) ?? 0;
  for (let i = 0; i < params.moduleIds.length; i++) {
    await insertCourseModuleMapping(
      {
        courseId: params.courseId,
        moduleId: params.moduleIds[i],
        position: lastPosition + 1 + i
      },
      transactionClient
    );
  }
}

export async function removeModuleMappings(
  params: { moduleIds: string[]; courseId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (let i = 0; i < params.moduleIds.length; i++) {
    await deleteCourseModuleMapping(params.courseId, params.moduleIds[i], transactionClient);
  }
}

export async function updateModuleMappings(
  params: { moduleIds: string[]; courseId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  if (!params.moduleIds || !Array.isArray(params.moduleIds)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid moduleIds');
  }
  // First, delete all existing mappings for the course
  await deleteAllModulesForCourse(params.courseId, transactionClient);

  // Then, insert the new mappings
  for (let i = 0; i < params.moduleIds.length; i++) {
    await insertCourseModuleMapping(
      {
        courseId: params.courseId,
        moduleId: params.moduleIds[i],
        position: i
      },
      transactionClient
    );
  }
}

export async function findStudentsForCourse(
  courseId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<any[]> {
  return await queryStudentsInCourse(courseId, transactionClient);
}

export default {
  findAllCourses,
  findCourseByField,
  createCourse,
  modifyCourseById
};
