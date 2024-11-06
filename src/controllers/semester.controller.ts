import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { db } from '../db/db.js';
import { BatchInsert } from '../db/schema/batch.schema.js';
import { SemesterWithBatches } from '../db/schema/semester.schema.js';
import { insertBatch, updateBatch } from '../models/batch.model.js';
import organizationService from '../services/organization.service.js';
import {
  createSemester as createSemesterService,
  findAllSemesters,
  findSemesterById,
  findSemesterByYearMonthOrgCombo
} from '../services/semester.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';

// const getOrganizations = catchAsync(async (req, res) => {
//   const page = req.query.page as unknown as number;
//   const limit = req.query.limit as unknown as number;
//   const options = { page, limit };
//   const keys = undefined;
//   const transactionClient = undefined;
//   const result = await organizationService.queryOrganizations(options, keys, transactionClient);
//   res.send(result);
// });

// const getOrganization = catchAsync(async (req, res) => {
//   const transactionClient = undefined;
//   const organization = await organizationService.getOrganizationById(
//     { findValue: req.params.orgId },
//     transactionClient
//   );
//   if (!organization) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
//   }
//   res.send(organization);
// });

export function createBatchObjectsWithBatchNames(
  year: number,
  month: number,
  orgName: string,
  batches: Extract<BatchInsert, 'mentorId'>[],
  indexOffset = 0
): BatchInsert[] {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  // Ensure month is within valid range (1-12)
  const validMonth = Math.max(1, Math.min(12, month));
  const monthName = monthNames[validMonth - 1];

  return (batches ?? []).map((batch: any, index) => ({
    ...batch,
    name: `${year}-${monthName}-${orgName}-Batch ${index + 1 + indexOffset}`,
    batchNumber: index + 1 + indexOffset
  }));
}

export const createSemester = catchAsync(async (req, res) => {
  const {
    year,
    month,
    orgId,
    batches
  }: {
    year: number;
    month: number;
    orgId: string;
    batches: Extract<BatchInsert, 'mentorId'>[];
  } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      const org = await organizationService.getOrganizationById(
        { findValue: orgId },
        ['name'],
        transactionClient
      );
      const orgName = org?.name;
      if (!orgName) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Invalid Organization');
      }
      const namedBatches: BatchInsert[] = createBatchObjectsWithBatchNames(
        year,
        month,
        orgName,
        batches
      );
      const user = await createSemesterService(
        {
          semester: {
            year,
            month,
            orgId
          },
          batches: namedBatches
        },
        transactionClient
      );

      res.status(httpStatus.CREATED).send(user);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Semester not created');
    }
  });
});

// TODO catch async
export async function updateSemester(req: any, res: any, next: any) {
  const { batches } = req.body;
  const { semesterId } = req.params;
  await db.transaction(async (transactionClient) => {
    try {
      let semester: SemesterWithBatches | undefined;
      if (semesterId) {
        semester = await findSemesterById({ semesterId, includeBatches: true }, transactionClient);
      } else {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Semester id is required');
      }

      const org = await organizationService.getOrganizationById(
        { findValue: semester.orgId },
        ['name'],
        transactionClient
      );
      const orgName = org?.name;
      if (!orgName) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Invalid Organization');
      }
      const requestBatchesWithoutId = (batches ?? [])?.filter((batch: any) => !batch.batchId);
      const requestBatchesWithId = (batches ?? [])?.filter((batch: any) => !!batch.batchId);
      const namedRequestBatchesWithoutId = createBatchObjectsWithBatchNames(
        semester.year,
        semester.month,
        orgName,
        requestBatchesWithoutId,
        semester.batches.length
      );

      const areAllPersistedBatchesPresent = semester?.batches.every((batch: any) => {
        const foundBatch = requestBatchesWithId.find(
          (reqBatch: any) => reqBatch.batchId === batch.batchId
        );
        return !!foundBatch;
      });

      const areAllReqBatchesWithIdPersisted = requestBatchesWithId.every((reqBatch: any) => {
        const foundBatch = semester?.batches.find(
          (batch: any) => batch.batchId === reqBatch.batchId
        );
        return !!foundBatch;
      });

      if (!areAllPersistedBatchesPresent) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'All persisted batches must be present in the request'
        );
      }

      if (!areAllReqBatchesWithIdPersisted) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'All request batches with ids must be present in the persisted batches'
        );
      }

      const updatedSemester: SemesterWithBatches = { ...semester, batches: [] };

      for (const batch of requestBatchesWithId) {
        // Update existing batches
        const updatedBatch = await updateBatch(batch.batchId, batch, transactionClient);
        updatedSemester.batches.push(updatedBatch);
      }

      for (const batch of namedRequestBatchesWithoutId) {
        // Create new batches
        const newBatch = await insertBatch(
          { ...batch, semesterId: semester.semesterId },
          transactionClient
        );
        updatedSemester.batches.push(newBatch);
      }
      res.send(updatedSemester);
    } catch (error: any) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.CONFLICT, `Semester not updated: ${error.message}`));
      // throw new ApiError(httpStatus.CONFLICT, 'Semester not updated');
    }
  });
}

export const getAllSemesters = catchAsync(async (req, res) => {
  const page = req.query.page as unknown as number;
  const limit = req.query.limit as unknown as number;
  const includeBatches = req.query.includeBatches as unknown as boolean;
  const options = { page, limit, includeBatches };
  const keys = undefined;
  const transactionClient = undefined;
  const result = await findAllSemesters(options, keys, transactionClient);
  res.send(result);
});

// const updateOrganization = catchAsync(async (req, res) => {
//   const {
//     email,
//     name,
//     givenOrgId,
//     isActive,
//     state,
//     address,
//     pincode,
//     contactPhoneNumber
//   }: {
//     email: string;
//     name: string;
//     role: string;
//     contactPhoneNumber: ContactPhoneNumber;
//     givenOrgId: string;
//     isActive: boolean;
//     state: string;
//     address: string;
//     pincode: string;
//   } = req.body;
//   await db.transaction(async (transactionClient) => {
//     try {
//       const org = await organizationService.updateOrgById(req.params.orgId, transactionClient, {
//         org: { email, name, givenOrgId, isActive, state, address, pincode, contactPhoneNumber }
//       });

//       res.status(httpStatus.ACCEPTED).send(org);
//     } catch (error) {
//       logger.error(error);
//       try {
//   await transactionClient.rollback();
// } catch (e) {}
//       throw new ApiError(httpStatus.CONFLICT, 'User not updated');
//     }
//   });
// });

export async function findSemester(req: any, res: any) {
  const { semesterId, year, month, orgId, includeBatches } = req.query;
  const transactionClient = db;
  let semester: SemesterWithBatches | undefined;
  if (semesterId) {
    semester = await findSemesterById({ semesterId, includeBatches }, transactionClient);
  } else if (year && month && orgId) {
    semester = await findSemesterByYearMonthOrgCombo(
      { year, month, orgId, includeBatches },
      transactionClient
    );
  }
  res.send(semester);
}
