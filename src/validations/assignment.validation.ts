import Joi from 'joi';
import {
  genericFilterDefinitionWithTypeChecks,
  genericSortDefinition
} from './custom.validation.js';
import { FilterField } from '../utils/helpers/parseFindAllQuery.js';

export const assignmentFilterFields: FilterField<string | 'uuid'>[] = [
  { field: 'assignmentId', type: 'uuid', searchTypes: ['EXACT_MATCH'] },
  { field: 'moduleSectionId', type: 'uuid', searchTypes: ['EXACT_MATCH'] },
  { field: 'courseName', type: 'string', searchTypes: ['CONTAINS', 'STARTS_WITH', 'EXACT_MATCH'] },
  { field: 'programName', type: 'string', searchTypes: ['CONTAINS', 'STARTS_WITH', 'EXACT_MATCH'] },
  {
    field: 'organizationId',
    type: 'uuid',
    searchTypes: ['EXACT_MATCH']
  }
];

export const findAssignments = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(genericFilterDefinitionWithTypeChecks(assignmentFilterFields)),
    sorts: Joi.array().items(
      genericSortDefinition([
        'programName',
        'courseName',
        'programId',
        'courseId',
        'moduleName',
        'moduleId',
        'moduleSectionTitle'
      ])
    ),
    includeModuleSection: Joi.boolean(),
    includeSubmissionCount: Joi.boolean(),
    includeModule: Joi.boolean(),
    includeCourse: Joi.boolean(),
    includeProgram: Joi.boolean(),
    includeOrganization: Joi.boolean()
  })
};
