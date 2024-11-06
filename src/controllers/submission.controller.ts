import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { SEARCH_KEYS } from '../constants/SearchTypes.js';
import { db } from '../db/db.js';
import { SubmissionStatus } from '../db/schema/enums.js';
import { SubmissionSearchColumns, SubmissionSortColumns } from '../db/schema/submission.schema.js';
import { updateSubmission } from '../models/submission.model.js';
import { createContentGroup, updateContentGroup } from '../services/contentGroup.service.js';
import { createGradeOrApplyModifications } from '../services/grade.service.js';
import {
  createSubmission,
  findAllSubmissions,
  findSubmissionById
} from '../services/submission.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { parseQuery, ValidFieldType } from '../utils/helpers/parseFindAllQuery.js';
import {
  mySubmissionsFilterFields,
  mySubmissionsSortFields,
  submissionFilterFields,
  submissionSortFields
} from '../validations/submission.validation.js';

interface SubmissionQueryParams {
  includeContentGroup: boolean;
  includeStudent: boolean;
  includeAssignment: boolean;
  includeGrade: boolean;
  includeModule: boolean;
  includeCourse: boolean;
}

// interface MySubmissionQueryParams {
//   includeGrade: boolean;
//   includeAssignment: boolean;
//   includeModule: boolean;
//   includeCourse: boolean;
// }

export const getSubmissions = catchAsync(async (req, res, next) => {
  const fieldFilters = req.url.startsWith('/my')
    ? mySubmissionsFilterFields
    : submissionFilterFields;
  const sortFields = req.url.startsWith('/my') ? mySubmissionsSortFields : submissionSortFields;
  const parsedFindParams = parseQuery<
    SubmissionSearchColumns,
    SubmissionSortColumns,
    ValidFieldType,
    ValidFieldType
  >(req, fieldFilters, sortFields);
  const {
    includeContentGroup,
    includeStudent,
    includeAssignment,
    includeGrade,
    includeCourse,
    includeModule
  } = req.query as unknown as SubmissionQueryParams;
  const options = {
    ...parsedFindParams,
    includeContentGroup,
    includeStudent,
    includeAssignment,
    includeGrade,
    includeModule,
    includeCourse,
    securityFilters: req.securityFilters
  };
  await db.transaction(async (transactionClient) => {
    try {
      const result = await findAllSubmissions(options, transactionClient);
      res.send(result);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.NOT_FOUND, 'Submissions not found'));
    }
  });
});

// export const getMySubmissions = catchAsync(async (req, res, next) => {
//   const parsedFindParams = parseQuery<
//     SubmissionSearchColumns,
//     SubmissionSortColumns,
//     ValidFieldType,
//     ValidFieldType
//   >(req, submissionFilterFields, submissionSortFields);
//   const { includeContentGroup, includeStudent, includeAssignment, includeGrade } =
//     req.query as unknown as MySubmissionQueryParams;
//   const options = {
//     ...parsedFindParams,
//     includeGrade,
//     includeAssignment,
//     includeModule,
//     includeCourse,
//     securityFilters: req.securityFilters
//   };
//   await db.transaction(async (transactionClient) => {
//     try {
//       const result = await findAllSubmissions(options, transactionClient);
//       res.send(result);
//     } catch (error) {
//       logger.error(error);
//       try {
//         await transactionClient.rollback();
//       } catch (e) {}
//       next(new ApiError(httpStatus.NOT_FOUND, 'Submissions not found'));
//     }
//   });
// });

export const postSubmission = catchAsync(async (req, res) => {
  const {
    assignmentId,
    contents
  }: {
    assignmentId: string;
    contents: string[];
  } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      if (
        !req.accountInfo ||
        req.accountInfo.accountType !== 'student' ||
        !req.accountInfo.student?.id
      ) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Only students can create submissions');
      }

      const exisitngSubmissions = await findAllSubmissions(
        {
          limit: 1,
          searchParams: [
            {
              searchColumn: 'assignmentId',
              searchType: SEARCH_KEYS.EXACT_MATCH,
              searchKey: assignmentId
            },
            {
              searchColumn: 'studentId',
              searchType: SEARCH_KEYS.EXACT_MATCH,
              searchKey: req.accountInfo.student.id
            }
          ],
          securityFilters: req.securityFilters
        },
        transactionClient
      );

      if (exisitngSubmissions?.results?.length > 0) {
        throw new ApiError(httpStatus.CONFLICT, 'Submission already exists');
      }

      const contentGroup = await createContentGroup(contents, transactionClient);
      const newSubmission = await createSubmission(
        {
          assignmentId,
          studentId: req.accountInfo.student.id,
          status: 'submitted',
          contentGroup: contentGroup.contentGroupId!
        },
        transactionClient
      );
      res.status(httpStatus.CREATED).send(newSubmission);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Submission not created');
    }
  });
});

export const getSubmission = catchAsync(async (req, res) => {
  const { submissionId } = req.params;
  const { includeContentGroup, includeStudent, includeAssignment, includeGrade } =
    req.query as unknown as SubmissionQueryParams;
  await db.transaction(async (transactionClient) => {
    try {
      const submission = await findSubmissionById(submissionId, {
        includeContentGroup,
        includeStudent,
        includeAssignment,
        includeGrade
      });
      if (!submission) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found');
      }
      res.send(submission);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found');
    }
  });
});

export const patchSubmission = catchAsync(async (req, res, next) => {
  const { submissionId } = req.params;
  const {
    status,
    contents,
    testCaseResults,
    autoAnalysisResults
  }: {
    status: SubmissionStatus;
    contents: string[];
    testCaseResults: { log: string };
    autoAnalysisResults: { result: string };
  } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      const submission = await findSubmissionById(submissionId, {}, transactionClient);
      if (!submission) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found');
      }
      await updateContentGroup(submission.contentGroup!, contents, transactionClient);
      const updatedSubmission = await updateSubmission(submissionId, {
        ...(status && { status }),
        ...(testCaseResults && { testCaseResults }),
        ...(autoAnalysisResults && { autoAnalysisResults })
      });
      res.send(updatedSubmission);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.CONFLICT, 'Submission not updated'));
    }
  });
});

export const putGradeForSubmission = catchAsync(async (req, res, next) => {
  const { submissionId } = req.params;
  const { score, feedback } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      // const grade = await findGradeBySubmissionId(submissionId, transactionClient);

      // if (!grade) {
      //   await createGrade(
      //     {
      //       submissionId,
      //       ...(score && { score }),
      //       ...(feedback && { feedback })
      //     },
      //     transactionClient
      //   );
      //   res.status(httpStatus.CREATED).send({ message: 'Grade created' });
      // } else {
      //   await modifyGrade(grade.gradeId, { score, feedback }, transactionClient);
      //   res.status(httpStatus.ACCEPTED).send({ message: 'Grade updated' });
      // }

      if (score !== undefined) {
        await updateSubmission(submissionId, {
          status: 'graded'
        });
      }

      const updatedGrade = await createGradeOrApplyModifications(
        { submissionId, ...(score && { score }), ...(feedback && { messages: feedback.messages }) },
        transactionClient
      );
      res.status(httpStatus.ACCEPTED).json(updatedGrade);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.CONFLICT, 'Submission not graded'));
    }
  });
});
