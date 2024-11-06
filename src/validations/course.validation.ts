import Joi from 'joi';
import { genericFilterDefinition, genericSortDefinition } from './custom.validation.js';

const createCourse = {
  body: Joi.object().keys({
    givenCourseId: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
    skills: Joi.string().required(),
    duration: Joi.number().required(),
    isActive: Joi.boolean().required(),
    modules: Joi.array().items(Joi.string().guid())
  }),
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().required(),
    buffer: Joi.binary().required()
  }).required()
};

const getCourses = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(genericFilterDefinition(['name', 'isActive', 'givenCourseId'])),
    sorts: Joi.array().items(genericSortDefinition(['name'])),
    includeModuleCount: Joi.boolean(),
    includeModules: Joi.boolean(),
    onlyDangling: Joi.boolean(),
    markDangling: Joi.boolean()
  })
};

const getCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    includeModuleCount: Joi.boolean(),
    includeModules: Joi.boolean()
  })
};

const patchCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      givenCourseId: Joi.string(),
      name: Joi.string(),
      description: Joi.string(),
      skills: Joi.string(),
      duration: Joi.number(),
      isActive: Joi.boolean(),
      modules: Joi.array().items(Joi.string().guid())
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

export const findCourseModules = {
  params: Joi.object().keys({
    courseId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    includeSectionContents: Joi.boolean(),
    includeModuleSections: Joi.boolean()
  })
};

export const patchStudentCourseMappings = {
  params: Joi.object().keys({
    courseId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      studentsToAdd: Joi.array().items(Joi.string().guid()),
      studentsToRemove: Joi.array().items(Joi.string().guid())
    })
    .or('studentsToAdd', 'studentsToRemove')
    .required()
};

export const getStudentCourseMappings = {
  params: Joi.object().keys({
    courseId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc')
  })
};

const cloneCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().guid().required()
  }),
  body: Joi.object().keys({
    name: Joi.string().required(),
    givenCourseId: Joi.string().required()
  })
};

export default {
  createCourse,
  getCourses,
  getCourse,
  patchCourse,
  cloneCourse
};
