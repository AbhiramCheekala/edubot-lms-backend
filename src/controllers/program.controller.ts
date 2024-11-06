import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { db } from '../db/db.js';
import { ProgramSearchColumn, ProgramSortColumn } from '../db/schema/program.schema.js';
import { deleteProgramCourses } from '../models/programCourseMap.model.js';
import programService, {
  addStudentsToProgram,
  findStudentsForProgram,
  removeStudentsFromProgram
} from '../services/program.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import {
  FilterField,
  parseQuery,
  QueryField,
  ValidFieldType
} from '../utils/helpers/parseFindAllQuery.js';
import {
  createBinaryObjectRecord,
  uploadFileToBlobStorage
} from '../services/binaryObject.service.js';
import { getPublicContainerStorageAccountName } from '../utils/helpers/azureStorage.helpers.js';

const programFilterFields: FilterField<string | boolean>[] = [
  { field: 'name', type: 'string' },
  { field: 'courseName', type: 'string' },
  { field: 'isActive', type: 'boolean' },
  { field: 'givenProgramId', type: 'string' }
];
const programSortFields: QueryField<string>[] = [{ field: 'name', type: 'string' }];
interface ProgramQueryParams {
  includeCourseCount: boolean;
  includeCourses: boolean;
}

const getPrograms = catchAsync(async function (req, res) {
  const {
    includeCourseCount,
    includeCourses
  }: { includeCourseCount: boolean; includeCourses: boolean } =
    req.query as unknown as ProgramQueryParams;
  const parsedFindParams = parseQuery<
    ProgramSearchColumn,
    ProgramSortColumn,
    ValidFieldType,
    ValidFieldType
  >(req, programFilterFields, programSortFields);
  const page = req.query.page as unknown as number;
  const limit = req.query.limit as unknown as number;
  const options = {
    page,
    limit,
    ...parsedFindParams,
    includeCourseCount,
    includeCourses,
    securityFilters: req.securityFilters
  };
  const keys = undefined;
  const transactionClient = undefined;
  const result = await programService.findAllPrograms(options, keys, transactionClient);
  res.send(result);
});

const getProgram = catchAsync(async function (req, res) {
  const {
    includeCourseCount,
    includeCourses
  }: { includeCourseCount: boolean; includeCourses: boolean } =
    req.query as unknown as ProgramQueryParams;
  const transactionClient = undefined;
  const program = await programService.findProgramByField(
    {
      findValue: req.params.programId,
      includeCourseCount,
      includeCourses,
      securityFilters: req.securityFilters
    },
    transactionClient
  );
  if (!program) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Program not found');
  }
  res.send(program);
});

const createProgram = catchAsync(async function (req, res) {
  const {
    name,
    givenProgramId,
    description,
    skills,
    duration,
    isActive,
    courses = []
  }: {
    name: string;
    givenProgramId: string;
    isActive: boolean;
    description: string;
    skills: string;
    duration: number;
    courses: string[];
  } = req.body;

  await db.transaction(async (transactionClient) => {
    try {
      if (!req.file) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Banner is required');
      }

      const storageAccountName = getPublicContainerStorageAccountName();
      if (!storageAccountName) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Storage account name not found');
      }
      const fileMetadata = await uploadFileToBlobStorage({
        file: {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        blobResolutionParams: {
          containerBaseName: 'programBanners',
          storageAccountName,
          createIfNotExists: false,
          createionStrategy: 'simple',
          newContainerAccessType: 'container'
        }
      });

      const binaryObjectId = await createBinaryObjectRecord(fileMetadata, transactionClient);
      if (!binaryObjectId) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to create binary object record'
        );
      }

      const program = await programService.createProgram(
        {
          Program: {
            name,
            isActive,
            givenProgramId,
            description,
            duration,
            skills,
            bannerRef: binaryObjectId
          }
        },
        transactionClient
      );

      const programId: string = program.programId!;

      if (courses.length > 0) {
        await programService.mapCoursesToProgram(programId, courses, transactionClient);
      }

      res.status(httpStatus.CREATED).send(program);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Program not created');
    }
  });
});

const updateProgram = catchAsync(async function (req, res) {
  const {
    name,
    givenProgramId,
    description,
    skills,
    duration,
    isActive,
    courses
  }: {
    name: string;
    givenProgramId: string;
    isActive: boolean;
    description: string;
    skills: string;
    duration: number;
    courses?: string[];
  } = req.body;

  const programId = req.params.programId;

  await db.transaction(async (transactionClient) => {
    try {
      let binaryObjectId;
      if (req.file) {
        const storageAccountName = getPublicContainerStorageAccountName();
        if (!storageAccountName) {
          throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Storage account name not found');
        }
        const fileMetadata = await uploadFileToBlobStorage({
          file: {
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          },
          blobResolutionParams: {
            containerBaseName: 'programBanners',
            storageAccountName,
            createIfNotExists: false,
            createionStrategy: 'simple',
            newContainerAccessType: 'container'
          }
        });

        binaryObjectId = await createBinaryObjectRecord(fileMetadata, transactionClient);
        if (!binaryObjectId) {
          throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Failed to create binary object record'
          );
        }
      }

      const program = await programService.updateProgramById(programId, transactionClient, {
        program: {
          name,
          givenProgramId,
          description,
          skills,
          duration,
          isActive,
          ...(binaryObjectId && { bannerRef: binaryObjectId })
        }
      });
      if (Array.isArray(courses)) {
        if (courses.length === 0) {
          await deleteProgramCourses(programId, transactionClient);
        } else {
          await deleteProgramCourses(programId, transactionClient);
          await programService.mapCoursesToProgram(programId, courses, transactionClient);
        }
      }

      res.status(httpStatus.ACCEPTED).send(program);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Program not updated');
    }
  });
});

const patchStudentProgramMappings = catchAsync(async function (req, res) {
  const { programId } = req.params;
  const { studentsToAdd, studentsToRemove } = req.body;

  await db.transaction(async (transactionClient) => {
    try {
      if (studentsToAdd && studentsToAdd.length > 0) {
        await addStudentsToProgram({ studentIds: studentsToAdd, programId }, transactionClient);
      }
      if (studentsToRemove && studentsToRemove.length > 0) {
        await removeStudentsFromProgram(
          { studentIds: studentsToRemove, programId },
          transactionClient
        );
      }
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Failed to update student program mappings');
    }
  });
});

const getStudentProgramMappings = catchAsync(async function (req, res) {
  const { programId } = req.params;
  await db.transaction(async (transactionClient) => {
    try {
      const students = await findStudentsForProgram(programId);
      res.send(students);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Failed to get student program mappings');
    }
  });
});

const cloneProgram = catchAsync(async function (req, res) {
  const { programId } = req.params;
  const { name, givenProgramId } = req.body;

  await db.transaction(async (transactionClient) => {
    try {
      const existingProgram = await programService.findProgramByField(
        {
          findValue: programId,
          includeCourseCount: false,
          includeCourses: true,
          securityFilters: req.securityFilters
        },
        transactionClient
      );

      if (!existingProgram) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Source program not found');
      }

      const newProgram = await programService.createProgram(
        {
          Program: {
            name,
            givenProgramId,
            description: existingProgram.description!,
            skills: existingProgram.skills!,
            duration: existingProgram.duration!,
            isActive: existingProgram.isActive!,
            bannerRef: existingProgram.bannerRef!
          }
        },
        transactionClient
      );

      if (!newProgram || !newProgram.programId) {
        throw new ApiError(httpStatus.CONFLICT, 'Unable to clone program');
      }

      if (existingProgram.courses) {
        const courseIds = existingProgram.courses.map((course: any) => course.courseId);
        if (courseIds.length > 0) {
          await programService.mapCoursesToProgram(
            newProgram.programId,
            courseIds,
            transactionClient
          );
        }
      }

      res.status(httpStatus.CREATED).send(newProgram);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(httpStatus.CONFLICT, 'Program not cloned');
    }
  });
});

export default {
  getPrograms,
  getProgram,
  createProgram,
  updateProgram,
  patchStudentProgramMappings,
  getStudentProgramMappings,
  cloneProgram
};
