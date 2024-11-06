import Joi from 'joi';
import { genericFilterDefinition, genericSortDefinition } from './custom.validation.js';
// import { password } from './custom.validation.js';

export const createStudent = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    name: Joi.string().required(),
    organization: Joi.string().guid().required(),
    isActive: Joi.boolean().required(),
    sendEmail: Joi.boolean().required(),
    joiningDate: Joi.date().required(),
    givenStudentId: Joi.string().required(),
    apsche: Joi.boolean().required(),
    gender: Joi.string().valid('male', 'female').required(),
    batchId: Joi.string().guid().required(),
    personalEmail: Joi.string(),
    dateOfBirth: Joi.date().required(),
    contactPhoneNumber: Joi.object()
      .keys({
        countryCode: Joi.string().required(),
        number: Joi.string().required()
      })
      .required()
  })
};

export const getStudents = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(
      genericFilterDefinition(['name', 'givenStudentId', 'email', 'orgName', 'batchId', 'isActive'])
    ),
    sorts: Joi.array().items(genericSortDefinition(['name', 'givenStudentId', 'email', 'orgName'])),
    includeRole: Joi.boolean(),
    includeOrg: Joi.boolean(),
    includeBatch: Joi.boolean(),
    includeMentor: Joi.boolean()
  })
};

export const getStudent = {
  query: Joi.object().keys({
    includeRole: Joi.boolean(),
    includeOrg: Joi.boolean(),
    includeBatch: Joi.boolean(),
    includeMentor: Joi.boolean()
  }),

  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
  })
};

export const updateStudent = {
  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      name: Joi.string(),
      organization: Joi.string().guid(),
      isActive: Joi.boolean(),
      sendEmail: Joi.boolean(),
      joiningDate: Joi.date(),
      givenStudentId: Joi.string(),
      personalEmail: Joi.string(),
      dateOfBirth: Joi.date(),
      apsche: Joi.boolean(),
      gender: Joi.string().valid('male', 'female'),
      batchId: Joi.string().guid(),
      contactPhoneNumber: Joi.object().keys({
        countryCode: Joi.string().required(),
        number: Joi.string().required()
      })
    })
    .min(1)
};

export const disableStudent = {
  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
  })
};

export const updateStudentCourseMappings = {
  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      coursesToAdd: Joi.array().items(Joi.string().guid()),
      coursesToRemove: Joi.array().items(Joi.string().guid())
    })
    .or('coursesToAdd', 'coursesToRemove')
    .required()
};

export const findStudentCourseMappings = {
  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc')
  })
};

export const updateStudentProgramMappings = {
  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      programsToAdd: Joi.array().items(Joi.string().guid()),
      programsToRemove: Joi.array().items(Joi.string().guid())
    })
    .or('programsToAdd', 'programsToRemove')
    .required()
};

export const findStudentProgramMappings = {
  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc')
  })
};

export const updateStudentProfile = {
  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      personalEmail: Joi.string().email(),
      dateOfBirth: Joi.date(),
      contactPhoneNumber: Joi.object().keys({
        countryCode: Joi.string().required(),
        number: Joi.string().required()
      }),
      languagesKnown: Joi.array().items(Joi.string()),
      fullAddress: Joi.string(),
      linkedinUrl: Joi.string().uri(),
      githubUrl: Joi.string().uri(),
      educationHSCName: Joi.string(),
      educationHSCSubjectSpecialization: Joi.string(),
      educationHSCMentionYear: Joi.string(),
      educationUniversityOrCollege: Joi.string(),
      educationUniversityOrCollegeSubjectSpecialization: Joi.string(),
      educationUniversityOrCollegeSubject: Joi.string()
    })
    .min(1)
};

export const updateStudentProfilePicture = {
  params: Joi.object().keys({
    studentId: Joi.string().guid().required()
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
