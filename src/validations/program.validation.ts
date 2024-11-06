import Joi from 'joi';
import { genericFilterDefinition, genericSortDefinition } from './custom.validation.js';
export const getPrograms = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(
      genericFilterDefinition(['name', 'isActive', 'courseName', 'givenProgramId'])
    ),
    sorts: Joi.array().items(genericSortDefinition(['name'])),
    includeCourseCount: Joi.boolean(),
    includeCourses: Joi.boolean()
  })
};
export const createProgram = {
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      givenProgramId: Joi.string().required(),
      isActive: Joi.boolean().required(),
      description: Joi.string().required(),
      skills: Joi.string().required(),
      duration: Joi.number().required(),
      courses: Joi.array().items(Joi.string()).required()
    })
    .required(),
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().required(),
    buffer: Joi.binary().required()
  }).required()
};

export const updateProgram = {
  body: Joi.object()
    .keys({
      name: Joi.string(),
      givenProgramId: Joi.string(),
      isActive: Joi.boolean(),
      description: Joi.string(),
      skills: Joi.string(),
      duration: Joi.number(),
      courses: Joi.array().items(Joi.string())
    })
    .min(1),
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().required(),
    buffer: Joi.binary().required()
  }).optional()
};
export const getProgram = {
  query: Joi.object().keys({
    includeCourseCount: Joi.boolean(),
    includeCourses: Joi.boolean()
  }),
  params: Joi.object().keys({
    programId: Joi.string().guid().required()
  })
};

export const patchStudentProgramMappings = {
  params: Joi.object().keys({
    programId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      studentsToAdd: Joi.array().items(Joi.string().guid()),
      studentsToRemove: Joi.array().items(Joi.string().guid())
    })
    .or('studentsToAdd', 'studentsToRemove')
    .required()
};

export const getStudentProgramMappings = {
  params: Joi.object().keys({
    programId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc')
  })
};

export const cloneProgram = {
  params: Joi.object().keys({
    programId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      givenProgramId: Joi.string().required()
    })
    .required()
};
