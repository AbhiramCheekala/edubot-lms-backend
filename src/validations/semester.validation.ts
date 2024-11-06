import Joi from 'joi';
import { validateYearAndMonth } from './custom.validation.js';

export const getSemesters = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    includeBatches: Joi.boolean()
  })
};

export const createSemester = {
  body: Joi.object()
    .keys({
      year: Joi.number()
        .integer()
        .min(new Date().getFullYear())
        .max(new Date().getFullYear() + 3)
        .required(),
      month: Joi.number().integer().min(1).max(12).required(),
      orgId: Joi.string().guid().required(),
      batches: Joi.array().items(
        Joi.object().keys({
          mentorId: Joi.string().guid().required()
        })
      )
    })
    .custom(validateYearAndMonth)
};

export const updateSemester = {
  params: Joi.object().keys({
    semesterId: Joi.string().guid().required()
  }),
  body: Joi.object().keys({
    batches: Joi.array().items(
      Joi.object().keys({
        mentorId: Joi.string().guid().required(),
        batchId: Joi.string().guid()
      })
    )
  })
};

export const findSemester = {
  query: Joi.object()
    .keys({
      semesterId: Joi.string().guid({ version: 'uuidv4' }),
      year: Joi.number().integer().min(2000).max(2100),
      month: Joi.number().integer().min(1).max(12),
      orgId: Joi.string().max(100),
      includeBatches: Joi.boolean()
    })
    .custom((value, helpers) => {
      if (value.semesterId) {
        // If semesterId is provided, year, month, and orgId should not be present
        if (value.year || value.month || value.orgId) {
          return helpers.error('object.xor');
        }
      } else {
        // If semesterId is not provided, year, month, and orgId are required
        if (!value.year || !value.month || !value.orgId) {
          return helpers.error('object.and');
        }
      }
      return value;
    })
    .messages({
      'object.xor': 'Provide either semesterId or the combination of year, month, and orgId',
      'object.and': 'Year, month, and orgId are required when semesterId is not provided'
    })
};

export const updateOrganization = {
  body: Joi.object().keys({
    email: Joi.string().email(),
    name: Joi.string(),
    givenOrgId: Joi.string(),
    isActive: Joi.boolean(),
    state: Joi.string(),
    address: Joi.string(),
    pincode: Joi.string(),
    contactPhoneNumber: Joi.object().keys({
      countryCode: Joi.string().required(),
      number: Joi.string().required()
    })
  })
};

export const getOrganization = {
  params: Joi.object().keys({
    orgId: Joi.string().guid().required()
  })
};
