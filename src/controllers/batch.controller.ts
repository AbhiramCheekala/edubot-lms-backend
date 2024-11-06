import { db } from '../db/db.js';
import { findAllBatches, findBatchesByOrgId } from '../services/batch.service.js';
import catchAsync from '../utils/catchAsync.js';
import { parseQuery, ValidFieldType } from '../utils/helpers/parseFindAllQuery.js';
import { BatchSearchColumn, BatchSortColumn } from '../db/schema/batch.schema.js';
import { batchFilterFields, batchSortFields } from '../validations/batch.validation.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

export const getBatchesForOrganization = catchAsync(async (req, res) => {
  const { orgId } = req.params;
  const transactionClient = db;
  const result = await findBatchesByOrgId(orgId, transactionClient, req.securityFilters);
  res.send(result);
});

interface batchQueryParams {
  includeStudentCount: boolean;
}

export const getAllBatches = catchAsync(async (req, res, next) => {
  const parsedFindParams = parseQuery<
    BatchSearchColumn,
    BatchSortColumn,
    ValidFieldType,
    ValidFieldType
  >(req, batchFilterFields, batchSortFields);
  const orgId = req.query.orgId as string;
  const { includeStudentCount } = req.query as unknown as batchQueryParams;
  const limit = parseInt(req.query.limit as string) || 10;
  const page = parseInt(req.query.page as string) || 1;
  const { searchParams, sortParams } = parsedFindParams;

  await db.transaction(async (transactionClient) => {
    try {
      const result = await findAllBatches(
        limit,
        page,
        orgId,
        includeStudentCount,
        searchParams,
        sortParams,
        req.securityFilters,
        transactionClient
      );
      res.send(result);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}

      next(new ApiError(httpStatus.NOT_FOUND, 'Batches not found'));
    }
  });
});
