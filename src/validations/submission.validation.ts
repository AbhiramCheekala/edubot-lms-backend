import Joi from 'joi';
import { FilterField, QueryField } from '../utils/helpers/parseFindAllQuery.js';
import {
  genericFilterDefinitionWithTypeChecks,
  genericSortDefinition
} from './custom.validation.js';

export const submissionFilterFields: FilterField<string | 'uuid'>[] = [
  { field: 'assignmentId', type: 'uuid', searchTypes: ['EXACT_MATCH'] },
  { field: 'studentId', type: 'uuid', searchTypes: ['EXACT_MATCH'] },
  { field: 'orgId', type: 'uuid', searchTypes: ['EXACT_MATCH'] },
  { field: 'status', type: 'string', searchTypes: ['EXACT_MATCH'] },
  { field: 'studentName', type: 'string', searchTypes: ['CONTAINS', 'STARTS_WITH', 'EXACT_MATCH'] }
];

export const mySubmissionsFilterFields: FilterField<string | 'uuid'>[] = [
  { field: 'moduleId', type: 'uuid', searchTypes: ['EXACT_MATCH'] },
  { field: 'courseId', type: 'uuid', searchTypes: ['EXACT_MATCH'] },
  { field: 'submissionDateRange', type: 'dateRange', searchTypes: ['DATE_RANGE'] }
];

const mySubmissionsSortColumns = [
  'submissionDate',
  'courseName',
  'moduleName',
  'assignmentName',
  'courseId',
  'moduleId'
];

const submissionSortColumns = [
  'assignmentId',
  'studentId',
  'status',
  'studentName',
  'submissionId'
];

export const submissionSortFields: QueryField<string>[] = submissionSortColumns.map((field) => ({
  field,
  type: 'string'
}));

export const mySubmissionsSortFields: QueryField<string>[] = mySubmissionsSortColumns.map(
  (field) => ({
    field,
    type: 'string'
  })
);

export const findSubmissions = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(genericFilterDefinitionWithTypeChecks(submissionFilterFields)),
    sorts: Joi.array().items(genericSortDefinition(submissionSortColumns)),
    includeContentGroup: Joi.boolean(),
    includeStudent: Joi.boolean(),
    includeAssignment: Joi.boolean(),
    includeGrade: Joi.boolean()
  })
};

export const findMySubmissions = {
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.array().items(genericFilterDefinitionWithTypeChecks(mySubmissionsFilterFields)),
    sorts: Joi.array().items(genericSortDefinition(mySubmissionsSortColumns)),
    includeGrade: Joi.boolean(),
    includeAssignment: Joi.boolean(),
    includeModule: Joi.boolean(),
    includeCourse: Joi.boolean()
  })
};

export const createSubmission = {
  body: Joi.object().keys({
    assignmentId: Joi.string().uuid().required(),
    contents: Joi.array().items(Joi.string().uuid()).min(1).required()
  })
};

export const updateSubmission = {
  params: Joi.object().keys({
    submissionId: Joi.string().uuid().required()
  }),
  body: Joi.object().keys({
    status: Joi.string().required(),
    testCaseResults: Joi.array().items(Joi.object().keys({ log: Joi.string().required() })),
    autoAnalysisResults: Joi.array().items(Joi.object().keys({ result: Joi.string().required() }))
  })
};

export const findSubmission = {
  params: Joi.object().keys({
    submissionId: Joi.string().uuid().required()
  }),
  query: Joi.object().keys({
    includeContentGroup: Joi.boolean(),
    includeStudent: Joi.boolean(),
    includeAssignment: Joi.boolean(),
    includeGrade: Joi.boolean()
  })
};

export const applyGradeForSubmission = {
  params: Joi.object().keys({
    submissionId: Joi.string().uuid().required()
  }),
  body: Joi.object()
    .keys({
      score: Joi.number().integer().min(0).max(100).optional(),
      feedback: Joi.object()
        .keys({
          messages: Joi.array()
            .items(Joi.object().keys({ content: Joi.string().required() }))
            .min(1)
        })
        .optional()
    })
    .min(1)
};
