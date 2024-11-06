import httpStatus from 'http-status';
import logger from '../config/logger.js';
import {
  PlatformType,
  PlatformTypesReverse,
  PlatformTypeValue
} from '../constants/PlatformTypes.constants.js';
import { db } from '../db/db.js';
import { CourseSearchColumn, CourseSortColumn } from '../db/schema/course.schema.js';
import {
  createBinaryObjectRecord,
  uploadFileToBlobStorage
} from '../services/binaryObject.service.js';
import courseService, {
  addStudentsToCourse,
  findStudentsForCourse,
  removeStudentsFromCourse
} from '../services/course.service.js';
import {
  createModule,
  findAllModulesForCourse,
  updateSectionMappings
} from '../services/module.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { getPublicContainerStorageAccountName } from '../utils/helpers/azureStorage.helpers.js';
import {
  FilterField,
  parseQuery,
  QueryField,
  ValidFieldType
} from '../utils/helpers/parseFindAllQuery.js';
import { createModuleSectionUtil } from './module.controller.js';

interface CourseQueryParams {
  includeModuleCount: boolean;
  includeModules: boolean;
  onlyDangling: boolean;
  markDangling: boolean;
}

const courseFilterFields: FilterField<string | boolean>[] = [
  { field: 'name', type: 'string' },
  { field: 'isActive', type: 'boolean' },
  { field: 'givenCourseId', type: 'string' }
];

const courseSortFields: QueryField<string>[] = [{ field: 'name', type: 'string' }];

const getCourses = catchAsync(async (req, res) => {
  const parsedFindParams = parseQuery<
    CourseSearchColumn,
    CourseSortColumn,
    ValidFieldType,
    ValidFieldType
  >(req, courseFilterFields, courseSortFields);

  const { includeModuleCount, includeModules, onlyDangling, markDangling } =
    req.query as unknown as CourseQueryParams;

  const options = {
    ...parsedFindParams,
    includeModuleCount,
    includeModules,
    onlyDangling,
    markDangling,
    securityFilters: req.securityFilters
  };
  const keys = undefined;
  const transactionClient = undefined;
  const result = await courseService.findAllCourses(options, keys, transactionClient);
  res.send(result);
});

const getCourse = catchAsync(async (req, res) => {
  const { includeModuleCount, includeModules } = req.query as unknown as CourseQueryParams;
  const course = await courseService.findCourseByField({
    findValue: req.params.courseId,
    includeModuleCount,
    includeModules,
    securityFilters: req.securityFilters
  });
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }
  res.send(course);
});

const postCourse = catchAsync(async (req, res) => {
  const {
    givenCourseId,
    name,
    description,
    skills,
    duration,
    isActive,
    modules
  }: {
    givenCourseId: string;
    name: string;
    description: string;
    skills: string;
    duration: number;
    isActive: boolean;
    modules: string[];
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
          containerBaseName: 'courseBanners',
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

      const newCourse = await courseService.createCourse(
        {
          course: {
            givenCourseId,
            name,
            description,
            skills,
            duration,
            isActive,
            bannerRef: binaryObjectId
          },
          modules
        },
        transactionClient
      );
      res.status(httpStatus.CREATED).send(newCourse);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Course not created');
    }
  });
});

const patchCourse = catchAsync(async (req, res) => {
  const courseId = req.params.courseId;
  const {
    givenCourseId,
    name,
    description,
    skills,
    duration,
    isActive,
    modules
  }: {
    givenCourseId: string;
    name: string;
    description: string;
    skills: string;
    duration: number;
    isActive: boolean;
    modules: string[];
  } = req.body;

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
            containerBaseName: 'courseBanners',
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

      const updatedCourse = await courseService.modifyCourseById(courseId, transactionClient, {
        course: {
          givenCourseId,
          name,
          description,
          skills,
          duration,
          isActive,
          ...(binaryObjectId && { bannerRef: binaryObjectId })
        },
        modules
      });

      res.status(httpStatus.ACCEPTED).send(updatedCourse);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Course not updated');
    }
  });
});

const patchStudentCourseMappings = catchAsync(async function (req, res) {
  const { courseId } = req.params;
  const { studentsToAdd, studentsToRemove } = req.body;

  await db.transaction(async (transactionClient) => {
    try {
      if (studentsToAdd && studentsToAdd.length > 0) {
        await addStudentsToCourse({ studentIds: studentsToAdd, courseId }, transactionClient);
      }
      if (studentsToRemove && studentsToRemove.length > 0) {
        await removeStudentsFromCourse(
          { studentIds: studentsToRemove, courseId },
          transactionClient
        );
      }
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Failed to update student course mappings');
    }
  });
});

const getStudentCourseMappings = catchAsync(async function (req, res) {
  const { courseId } = req.params;
  await db.transaction(async (transactionClient) => {
    try {
      const students = await findStudentsForCourse(courseId);
      res.send(students);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Failed to get student course mappings');
    }
  });
});

const cloneCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { name, givenCourseId } = req.body;

  await db.transaction(async (transactionClient) => {
    try {
      const sourceCourse = await courseService.findCourseByField({
        findValue: courseId,
        securityFilters: req.securityFilters
      });

      if (!sourceCourse) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Source course not found');
      }

      const modules = await findAllModulesForCourse(
        courseId,
        { includeModuleSections: true, includeSectionContents: true },
        transactionClient
      );
      const newModules = [];
      for (const module of modules) {
        const newModule = await createModule(
          {
            module: {
              title: module.title,
              summary: module.summary
            }
          },
          transactionClient
        );
        const sectionIds = [];
        for (const section of module.moduleSections) {
          const mappedSection = {
            type: section.sectionType,
            contents: section.contents.map((c) => c.contentId).filter((c) => c !== undefined),
            title: section.title,
            ...(section.assignmentInfo && {
              templateRepository: section.assignmentInfo.templateRepository,
              platformType: section.assignmentInfo.platformType
                ? (PlatformTypesReverse[
                    section.assignmentInfo.platformType as PlatformTypeValue
                  ] as PlatformType)
                : undefined,
              autoGrading: section.assignmentInfo.autoGrading,
              testCaseGrading: section.assignmentInfo.testCaseGrading
            })
          };
          const { createdSectionIds } = await createModuleSectionUtil(
            mappedSection,
            transactionClient
          );
          sectionIds.push(...(createdSectionIds ?? []));
        }

        await updateSectionMappings(
          {
            sectionIds,
            moduleId: newModule.moduleId!
          },
          transactionClient
        );
        newModules.push(newModule);
      }

      const newCourse = await courseService.createCourse(
        {
          course: {
            givenCourseId,
            name,
            description: sourceCourse.description!,
            skills: sourceCourse.skills!,
            duration: sourceCourse.duration!,
            isActive: sourceCourse.isActive ?? true,
            bannerRef: sourceCourse.bannerRef!
          },
          modules: newModules.map((m) => m.moduleId!).filter((m) => m !== undefined)
        },
        transactionClient
      );

      res.status(httpStatus.CREATED).send(newCourse);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(httpStatus.CONFLICT, 'Failed to clone course');
    }
  });
});

export default {
  patchCourse,
  getCourse,
  getCourses,
  postCourse,
  patchStudentCourseMappings,
  getStudentCourseMappings,
  cloneCourse
};
