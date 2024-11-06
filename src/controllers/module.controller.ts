import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { PlatformType, PlatformTypes } from '../constants/PlatformTypes.constants.js';
import { db, Schema } from '../db/db.js';
import { AssignmentPartial } from '../db/schema/assignment.schema.js';
import { ContentGroupPartial } from '../db/schema/contentGroup.schema.js';
import { ModuleSectionPartial } from '../db/schema/moduleSection.schema.js';
import { updateAssignment } from '../models/assignment.model.js';
import { updateModule } from '../models/module.model.js';
import { updateModuleSection } from '../models/moduleSection.model.js';
import {
  createAssignment,
  findAssignmentByModuleSectionId
} from '../services/assignment.service.js';
import { createContentGroup, updateContentGroup } from '../services/contentGroup.service.js';
import {
  createModule,
  findAllModulesForCourse,
  findModuleById,
  updateSectionMappings
} from '../services/module.service.js';
import { createModuleSection, findModuleSectionById } from '../services/moduleSection.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { ModuleSection } from '../validations/module.validation.js';
import logger from '../config/logger.js';
import courseService from '../services/course.service.js';

interface ModuleSectionCreateResult {
  contentGroup?: ContentGroupPartial;
  moduleSection?: ModuleSectionPartial;
  createdSectionIds?: string[];
  sectionIds?: string[];
  assignment?: AssignmentPartial;
}

export async function createModuleSectionUtil(
  section: ModuleSection,
  transactionClient: NodePgDatabase<Schema>
): Promise<ModuleSectionCreateResult> {
  const retObj: ModuleSectionCreateResult = {};
  const createdSectionIds = [];
  const contentGroup = await createContentGroup(section.contents, transactionClient);
  retObj.contentGroup = contentGroup;
  const newSection = await createModuleSection(
    {
      contentGroup: contentGroup.contentGroupId!,
      sectionType: section.type,
      title: section.title
    },
    transactionClient
  );
  retObj.moduleSection = newSection;
  createdSectionIds.push(newSection.moduleSectionId);
  retObj.createdSectionIds = createdSectionIds;
  if (section.type === 'assignment') {
    const assignment = await createAssignment(
      {
        moduleSectionId: newSection.moduleSectionId,
        templateRepository: section.templateRepository!,
        platformType: PlatformTypes[section.platformType as PlatformType],
        autoGrading: section.autoGrading,
        testCaseGrading: section.testCaseGrading
      },
      transactionClient
    );
    retObj.assignment = assignment;
  }
  return retObj;
}

export const postModule = catchAsync(async (req: Request, res: Response, next: any) => {
  const { title, summary, sections } = req.body;

  await db.transaction(async (transactionClient) => {
    // Create the module
    try {
      const module = await createModule(
        {
          module: {
            title,
            summary
          }
        },
        transactionClient
      );
      const sectionIds = [];
      for (const section of sections) {
        const { createdSectionIds } = await createModuleSectionUtil(section, transactionClient);
        sectionIds.push(...(createdSectionIds ?? []));
      }

      await updateSectionMappings(
        {
          sectionIds,
          moduleId: module.moduleId!
        },
        transactionClient
      );

      res.status(httpStatus.CREATED).send(module);
    } catch (error: any) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});

export const putModule = catchAsync(async (req: Request, res: Response, next: any) => {
  const { title, summary, sections } = req.body;
  const moduleId = req.params.moduleId;

  await db.transaction(async (transactionClient) => {
    try {
      const existingModule = await findModuleById(moduleId);
      if (!existingModule) {
        return next(new ApiError(httpStatus.NOT_FOUND, 'Module not found'));
      }
      const module = await updateModule(moduleId, { title, summary }, transactionClient);
      const sectionIds = [];
      for (const section of sections) {
        const moduleSectionId = section.moduleSectionId;
        if (!moduleSectionId) {
          const { createdSectionIds } = await createModuleSectionUtil(section, transactionClient);
          sectionIds.push(...(createdSectionIds ?? []));
        } else {
          const moduleSection = await findModuleSectionById(
            moduleSectionId,
            undefined,
            transactionClient
          );

          if (!moduleSection) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Module section not found');
          }

          if (moduleSection.sectionType === 'assignment') {
            const assignment = await findAssignmentByModuleSectionId(moduleSectionId);
            if (!assignment) {
              throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
            }
            await updateAssignment(
              assignment.assignmentId!,
              {
                ...(section.templateRepository && {
                  templateRepository: section.templateRepository
                }),
                ...(section.platformType && {
                  platformType: PlatformTypes[section.platformType as PlatformType]
                }),
                ...(section.autoGrading && { autoGrading: section.autoGrading }),
                ...(section.testCaseGrading && { testCaseGrading: section.testCaseGrading })
              },
              transactionClient
            );
          }

          await updateContentGroup(moduleSection.contentGroup, section.contents, transactionClient);
          await updateModuleSection(
            moduleSectionId,
            {
              title: section.title
            },
            transactionClient
          );
          sectionIds.push(moduleSectionId);
        }
      }

      // Add section mappings to the module
      await updateSectionMappings(
        {
          sectionIds,
          moduleId: moduleId!
        },
        transactionClient
      );

      res.status(httpStatus.CREATED).send(module);
    } catch (error: any) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});

export const getModuleById = catchAsync(async (req: Request, res: Response, next: any) => {
  const { moduleId } = req.params;
  const { includeSectionContents, includeModuleSections } = req.query as unknown as {
    includeSectionContents: boolean;
    includeModuleSections: boolean;
  };

  await db.transaction(async (transactionClient) => {
    try {
      const module = await findModuleById(
        moduleId,
        { includeModuleSections, includeSectionContents },
        transactionClient,
        req.securityFilters
      );
      if (!module) {
        return next(new ApiError(httpStatus.NOT_FOUND, 'Module not found'));
      }

      res.send(module);
    } catch (error: any) {
      logger.error(error);
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});

export const getModulesByCourseId = catchAsync(async (req: Request, res: Response, next: any) => {
  const { courseId } = req.params;
  const { includeSectionContents, includeModuleSections } = req.query as unknown as {
    includeSectionContents: boolean;
    includeModuleSections: boolean;
  };

  await db.transaction(async (transactionClient) => {
    try {
      const course = await courseService.findCourseByField(
        {
          findValue: req.params.courseId,
          includeModuleCount: false,
          includeModules: false,
          securityFilters: req.securityFilters
        },
        undefined,
        transactionClient
      );
      if (!course) {
        return next(new ApiError(httpStatus.NOT_FOUND, 'Course not found'));
      }
      const modules = await findAllModulesForCourse(
        courseId,
        { includeModuleSections, includeSectionContents },
        transactionClient,
        req.securityFilters
      );
      res.send(modules);
    } catch (error: any) {
      logger.error(error);
      next(new ApiError(error.statusCode ?? httpStatus.BAD_REQUEST, error.message));
    }
  });
});
