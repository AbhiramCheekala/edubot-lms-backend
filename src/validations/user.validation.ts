import Joi from 'joi';
import { FilterField } from '../utils/helpers/parseFindAllQuery.js';
import {
  genericFilterDefinitionWithTypeChecks,
  genericSortDefinition
} from './custom.validation.js';
// import { password } from './custom.validation.js';

export const userFilterFields: FilterField<string | boolean>[] = [
  { field: 'name', type: 'string', searchTypes: ['CONTAINS', 'STARTS_WITH', 'EXACT_MATCH'] },
  { field: 'isActive', type: 'boolean', validValues: [true, false], searchTypes: ['EXACT_MATCH'] },
  { field: 'role', type: 'string', searchTypes: ['EXACT_MATCH', 'CONTAINS', 'STARTS_WITH'] },
  { field: 'givenUserId', type: 'string', searchTypes: ['EXACT_MATCH', 'CONTAINS', 'STARTS_WITH'] },
  {
    field: 'organization',
    type: 'string',
    searchTypes: ['EXACT_MATCH', 'CONTAINS', 'STARTS_WITH']
  },
  { field: 'orgId', type: 'uuid', searchTypes: ['EXACT_MATCH'] }
];

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    name: Joi.string().required(),
    role: Joi.string().guid().required(),
    organization: Joi.string().guid().required(),
    isActive: Joi.boolean().required(),
    sendEmail: Joi.boolean().required(),
    joiningDate: Joi.date().required(),
    givenUserId: Joi.string().required(),
    programMappings: Joi.array().items(Joi.string().guid()).optional(),
    contactPhoneNumber: Joi.object()
      .keys({
        countryCode: Joi.string().required(),
        number: Joi.string().required()
      })
      .required()
  })
};

const getUsers = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(genericFilterDefinitionWithTypeChecks(userFilterFields)),
    sorts: Joi.array().items(genericSortDefinition(['name', 'joiningDate']))
  })
};

const getUser = {
  query: Joi.object().keys({
    includeRole: Joi.boolean(),
    includeOrg: Joi.boolean(),
    includePrograms: Joi.boolean()
  }),
  params: Joi.object().keys({
    userId: Joi.string().guid().required()
  })
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.string().guid().required()
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      name: Joi.string(),
      role: Joi.string().guid(),
      organization: Joi.string().guid(),
      isActive: Joi.boolean(),
      sendEmail: Joi.boolean(),
      joiningDate: Joi.date(),
      givenUserId: Joi.string(),
      programMappings: Joi.array().items(Joi.string().guid()).optional(),
      contactPhoneNumber: Joi.object().keys({
        countryCode: Joi.string().required(),
        number: Joi.string().required()
      })
    })
    .min(1)
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().guid().required()
  })
};

export default {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser
};
