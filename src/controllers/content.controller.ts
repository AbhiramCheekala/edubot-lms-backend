import { BlobSASPermissions } from '@azure/storage-blob';
import { addHours } from 'date-fns';
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { ContentContainerType } from '../constants/AzureStorage.constants.js';
import { db } from '../db/db.js';
import { ContentInsert } from '../db/schema/content.schema.js';
import {
  createBinaryObjectRecord,
  uploadFileToBlobStorage
} from '../services/binaryObject.service.js';
import {
  createFileTypeContent,
  createLinkTypeContent,
  getContentById
} from '../services/content.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import {
  getContainerClientByContainerName,
  getPrivateContainerStorageAccountName
} from '../utils/helpers/azureStorage.helpers.js';

export const postContent = catchAsync(async (req: Request, res: Response) => {
  const {
    type,
    url,
    objectType: containerBaseName
  } = req.query as unknown as {
    type: string;
    url: string;
    objectType: ContentContainerType;
  };
  const file = req.file;

  await db.transaction(async (transactionClient) => {
    try {
      let newContent;

      if (type === 'file' && file) {
        // Handle file type content
        const storageAccountName = getPrivateContainerStorageAccountName();
        if (!storageAccountName) {
          throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Cannot determine storage account name'
          );
        }
        const fileMetadata = await uploadFileToBlobStorage({
          file: {
            buffer: file.buffer,
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype
          },
          blobResolutionParams: {
            containerBaseName,
            storageAccountName,
            createIfNotExists: true,
            createionStrategy: 'postfix-year-month'
          }
        });

        const binaryObjectId = await createBinaryObjectRecord(fileMetadata, transactionClient);

        const fileContent: Omit<ContentInsert, 'url'> = {
          type,
          binaryObjectRef: binaryObjectId
        };

        newContent = await createFileTypeContent(fileContent, transactionClient);
      } else if (type === 'link') {
        // Handle URL type content
        const urlContent: Omit<ContentInsert, 'binaryObjectRef'> = {
          type,
          url
        };

        newContent = await createLinkTypeContent(urlContent, transactionClient);
      } else {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid content type or missing file');
      }

      res.status(httpStatus.CREATED).send(newContent);
    } catch (error) {
      logger.error('Error creating content:', error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Content creation failed');
    }
  });
});

export const getContent = catchAsync(async (req: Request, res: Response) => {
  const contentId = req.params.contentId;
  const includeBinaryObject = req.query.includeBinaryObject as unknown as boolean;
  // TODO fix any
  const content: any = await getContentById(contentId, {
    includeBinaryObject
  });

  if (!content) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Content not found');
  }

  if (
    includeBinaryObject &&
    content.binaryObjectRef &&
    content.binaryObjectContainerName &&
    content.binaryObjectStorageAccountName
  ) {
    const { containerClient } = await getContainerClientByContainerName(
      content.binaryObjectContainerName,
      content.binaryObjectStorageAccountName
    );
    const blockBlobClient = containerClient.getBlockBlobClient(content.binaryObjectBlobName);
    const sasToken = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: addHours(new Date(), 2)
    });
    content.securedFileUrl = sasToken;
  }
  res.send(content);
});
