import Joi from 'joi';
import { genericFilterDefinition, genericSortDefinition } from './custom.validation.js';

export const getOrganizations = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(genericFilterDefinition(['name', 'givenOrgId', 'email'])),
    sorts: Joi.array().items(genericSortDefinition(['name', 'givenOrgId'])),
    includeStudentCount: Joi.boolean(),
    includeBatchCount: Joi.boolean()
  })
};

export const createOrganization = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    name: Joi.string().required(),
    givenOrgId: Joi.string().required(),
    isActive: Joi.boolean().required(),
    state: Joi.string().required(),
    address: Joi.string().required(),
    pincode: Joi.string().required(),
    githubOrgUri: Joi.string().required(),
    contactPhoneNumber: Joi.object()
      .keys({
        countryCode: Joi.string().required(),
        number: Joi.string().required()
      })
      .required()
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
    githubOrgUri: Joi.string(),
    contactPhoneNumber: Joi.object().keys({
      countryCode: Joi.string().required(),
      number: Joi.string().required()
    })
  })
};

export const getOrganization = {
  params: Joi.object().keys({
    orgId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    includeStudentCount: Joi.boolean(),
    includeBatchCount: Joi.boolean()
  })
};
