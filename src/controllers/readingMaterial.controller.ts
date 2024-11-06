import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { db } from '../db/db.js';
import {
  addReadingMaterialNote,
  findStudentNotesForContent
} from '../services/readingMaterialNote.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';

export const getStudentNotesForContent = catchAsync(async (req, res, next) => {
  const { contentId } = req.params;
  db.transaction(async (transactionClient) => {
    try {
      const result = await findStudentNotesForContent(
        contentId,
        transactionClient,
        req.securityFilters
      );
      res.send(result);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.NOT_FOUND, 'Student notes not found'));
    }
  });
});

export const putNoteForContent = catchAsync(async (req, res, next) => {
  const { contentId } = req.params;
  const { note } = req.body;
  const securityFilters = req.securityFilters;
  db.transaction(async (transactionClient) => {
    try {
      const result = await addReadingMaterialNote(
        {
          contentId,
          note
        },
        transactionClient,
        securityFilters
      );
      res.send(result);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      next(new ApiError(httpStatus.NOT_FOUND, 'Note not saved'));
    }
  });
});
