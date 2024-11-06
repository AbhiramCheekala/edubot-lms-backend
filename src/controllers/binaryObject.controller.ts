import { BlobSASPermissions } from '@azure/storage-blob';
import { addHours } from 'date-fns';
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { StorageAccounts } from '../constants/AzureStorage.constants.js';
import { findBinaryObjectById } from '../services/binaryObject.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { getContainerClientByContainerName } from '../utils/helpers/azureStorage.helpers.js';
import { BinaryObjectFull } from '../db/schema/binaryObject.schema.js';
// export const postContent = catchAsync(async (req: Request, res: Response) => {
//   const {
//     type,
//     url,
//     objectType: containerBaseName
//   } = req.query as unknown as {
//     type: string;
//     url: string;
//     objectType: ContentContainerType;
//   };
//   const file = req.file;

//   await db.transaction(async (transactionClient) => {
//     try {
//       let newContent;

//       if (type === 'file' && file) {
//         // Handle file type content
//         const storageAccountName = getPrivateContainerStorageAccountName();
//         if (!storageAccountName) {
//           throw new ApiError(
//             httpStatus.INTERNAL_SERVER_ERROR,
//             'Cannot determine storage account name'
//           );
//         }
//         const fileMetadata = await uploadFileToBlobStorage({
//           file: {
//             buffer: file.buffer,
//             originalname: file.originalname,
//             size: file.size,
//             mimetype: file.mimetype
//           },
//           blobResolutionParams: {
//             containerBaseName,
//             storageAccountName,
//             createIfNotExists: true,
//             createionStrategy: 'postfix-year-month'
//           }
//         });

//         const binaryObjectId = await createBinaryObjectRecord(fileMetadata, transactionClient);

//         const fileContent: Omit<ContentInsert, 'url'> = {
//           type,
//           binaryObjectRef: binaryObjectId
//         };

//         newContent = await createFileTypeContent(fileContent, transactionClient);
//       } else if (type === 'link') {
//         // Handle URL type content
//         const urlContent: Omit<ContentInsert, 'binaryObjectRef'> = {
//           type,
//           url
//         };

//         newContent = await createLinkTypeContent(urlContent, transactionClient);
//       } else {
//         throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid content type or missing file');
//       }

//       res.status(httpStatus.CREATED).send(newContent);
//     } catch (error) {
//       logger.error('Error creating content:', error);
//       try {
//         await transactionClient.rollback();
//       } catch (e) {}
//       throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Content creation failed');
//     }
//   });
// });

export const getBinaryObject = catchAsync(async (req: Request, res: Response) => {
  const binaryObjectId = req.params.binaryObjectId;
  const includeSecuredFileUrl = req.query.includeSecuredFileUrl;
  if (!binaryObjectId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Binary object not found');
  }

  const binaryObject: (BinaryObjectFull & { securedFileUrl?: string }) | null =
    await findBinaryObjectById(binaryObjectId);
  if (!binaryObject) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Binary object not found');
  }
  if (!(binaryObject.storageAccountName in StorageAccounts)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Storage account not found');
  }
  const { containerName, storageAccountName } = binaryObject;
  if (containerName && storageAccountName) {
    const { containerClient } = await getContainerClientByContainerName(
      containerName,
      storageAccountName as keyof typeof StorageAccounts
    );
    const blockBlobClient = containerClient.getBlockBlobClient(binaryObject.blobName);
    if (includeSecuredFileUrl) {
      const sasToken = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse('r'),
        expiresOn: addHours(new Date(), 2)
      });
      binaryObject.securedFileUrl = sasToken;
    }
  }
  res.send(binaryObject);
});
