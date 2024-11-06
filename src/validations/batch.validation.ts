import Joi from 'joi';
import { FilterField, QueryField } from '../utils/helpers/parseFindAllQuery.js';
import {
  genericFilterDefinitionWithTypeChecks,
  genericSortDefinition
} from './custom.validation.js';

export const batchFilterFields: FilterField<string | 'uuid'>[] = [
  { field: 'orgId', type: 'string', searchTypes: ['EXACT_MATCH'] },
  { field: 'name', type: 'string', searchTypes: ['CONTAINS'] }
];

const batchSortColumns: string[] = [];

export const batchSortFields: QueryField<string>[] = batchSortColumns.map((field) => ({
  field,
  type: 'string'
}));

export const getAllBatchesValidation = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(genericFilterDefinitionWithTypeChecks(batchFilterFields)),
    sorts: Joi.array().items(genericSortDefinition([])),
    includeStudentCount: Joi.boolean()
  })
};

export const getBatchesByOrgId = {
  params: Joi.object().keys({
    orgId: Joi.string().guid().required()
  })
};
