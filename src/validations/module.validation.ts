import Joi from 'joi';
import { ModuleSectionTypes } from '../db/schema/enums.js';
import { PlatformType, PlatformTypes } from '../constants/PlatformTypes.constants.js';

const sectionSchema = Joi.object({
  type: Joi.string()
    .valid(...['readingMaterial', 'assignment', 'links'])
    .required(),
  contents: Joi.array().items(Joi.string().uuid()).required(),
  title: Joi.string().required(),
  templateRepository: Joi.when('type', {
    is: 'assignment',
    then: Joi.string().uri().required(),
    otherwise: Joi.forbidden()
  }),
  platformType: Joi.when('type', {
    is: 'assignment',
    then: Joi.string()
      .valid(...Object.keys(PlatformTypes))
      .required(),
    otherwise: Joi.forbidden()
  }),
  autoGrading: Joi.when('type', {
    is: 'assignment',
    then: Joi.boolean().required(),
    otherwise: Joi.forbidden()
  }),
  testCaseGrading: Joi.when('type', {
    is: 'assignment',
    then: Joi.boolean().required(),
    otherwise: Joi.forbidden()
  })
});

export interface ModuleSection {
  type: ModuleSectionTypes;
  contents: string[];
  title: string;
  templateRepository?: string;
  platformType?: PlatformType;
  autoGrading?: boolean;
  testCaseGrading?: boolean;
}

export const createModule = Joi.object({
  title: Joi.string().required(),
  summary: Joi.string().required(),
  sections: Joi.array().items(sectionSchema).required()
});

export const findModule = Joi.object({
  params: Joi.object({
    moduleId: Joi.string().uuid().required()
  }),
  query: Joi.object({
    includeSectionContents: Joi.boolean(),
    includeModuleSections: Joi.boolean()
  })
});

export const modifyModule = {
  params: Joi.object({
    moduleId: Joi.string().uuid().required()
  }),
  body: Joi.object({
    title: Joi.string().optional(),
    summary: Joi.string().optional(),
    sections: Joi.array()
      .items(
        Joi.object({
          moduleSectionId: Joi.string().uuid().optional(),
          type: Joi.when('moduleSectionId', {
            is: Joi.exist(),
            then: Joi.forbidden(),
            otherwise: Joi.string()
              .valid(...['readingMaterial', 'assignment', 'links'])
              .required()
          }),
          contents: Joi.array().items(Joi.string().uuid()).required(),
          title: Joi.string().required(),
          templateRepository: Joi.string().uri().optional(),
          platformType: Joi.string()
            .valid(...Object.keys(PlatformTypes))
            .optional(),
          autoGrading: Joi.boolean().optional(),
          testCaseGrading: Joi.boolean().optional()
        })
      )
      .required()
  })
};
