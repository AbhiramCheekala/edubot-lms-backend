import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { db } from '../db/db.js';
import { AssignmentSearchColumns, AssignmentSortColumns } from '../db/schema/assignment.schema.js';
import { findAllAssignments } from '../services/assignment.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { parseQuery, QueryField, ValidFieldType } from '../utils/helpers/parseFindAllQuery.js';
import { assignmentFilterFields } from '../validations/assignment.validation.js';

interface AssignmentQueryParams {
  includeModuleSection: boolean;
  includeSubmissionCount: boolean;
  includeModule: boolean;
  includeCourse: boolean;
  includeProgram: boolean;
  includeOrganization: boolean;
}

const assignmentSortFields: QueryField<string>[] = [
  { field: 'courseName', type: 'string' },
  { field: 'programName', type: 'string' }
];

export const getAssignments = catchAsync(async (req, res, next) => {
  const parsedFindParams = parseQuery<
    AssignmentSearchColumns,
    AssignmentSortColumns,
    ValidFieldType,
    ValidFieldType
  >(req, assignmentFilterFields, assignmentSortFields);
  const {
    includeModuleSection,
    includeSubmissionCount,
    includeModule,
    includeCourse,
    includeProgram,
    includeOrganization
  } = req.query as unknown as AssignmentQueryParams;
  const options = {
    ...parsedFindParams,
    includeModuleSection,
    includeSubmissionCount,
    includeModule,
    includeCourse,
    includeProgram,
    includeOrganization
  };
  await db.transaction(async (transactionClient) => {
    try {
      const result = await findAllAssignments(
        { ...options, securityFilters: req.securityFilters },
        transactionClient
      );
      res.send(result);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.NOT_FOUND, 'Assignments not found'));
    }
  });
});
