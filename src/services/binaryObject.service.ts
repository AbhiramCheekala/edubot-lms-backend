// binaryObject.service.ts

import { v4 as uuidv4 } from 'uuid';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { fileTypeFromBuffer } from 'file-type';
import path from 'path';
import { db, Schema } from '../db/db.js';
import { BinaryObjectTable } from '../db/schema/binaryObject.schema.js';
import {
  BlobResolutionParams,
  ContentContainerType,
  PublicAssetsContainerType
} from '../constants/AzureStorage.constants.js';
import {
  getContainerClientByType,
  StorageAccountName
} from '../utils/helpers/azureStorage.helpers.js';
import { eq } from 'drizzle-orm';

interface UploadFileParams {
  file: {
    buffer: Buffer;
    originalname: string;
    size: number;
    mimetype: string;
  };
  blobResolutionParams: BlobResolutionParams;
}

export interface BinaryObjectMetadata {
  binaryObjectId: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  containerName: string;
  blobName: string;
  blobUrl: string;
  fileType: string;
  mimeTypeDetected: string;
  uploadedAt: Date;
  uploadedBy?: string;
  containerBaseName: ContentContainerType | PublicAssetsContainerType;
  storageAccountName: StorageAccountName;
  relatedEntityId?: string;
  processingStatus: string;
  isPublic: boolean;
  accessLevel: string;
  versionNumber: number;
  isLatestVersion: boolean;
  expiresAt: Date | null;
  retentionPolicy: string;
}

export const uploadFileToBlobStorage = async (
  params: UploadFileParams
): Promise<BinaryObjectMetadata> => {
  const { file, blobResolutionParams } = params;
  const { containerBaseName, storageAccountName } = blobResolutionParams;
  try {
    const { containerClient, containerName } = await getContainerClientByType(blobResolutionParams);
    const fileTypeResult = await fileTypeFromBuffer(file.buffer);
    const binaryObjectId = uuidv4();
    const blobName = `${binaryObjectId}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(file.buffer, file.size, {
      blobHTTPHeaders: {
        blobContentType: fileTypeResult?.mime ?? file.mimetype,
        blobContentDisposition: `attachment; filename="${file.originalname}"`
      }
    });

    const fileMetadata: BinaryObjectMetadata = {
      binaryObjectId: binaryObjectId,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileExtension: path.extname(file.originalname),
      containerName: containerName,
      blobName: blobName,
      blobUrl: blockBlobClient.url,
      fileType: fileTypeResult?.ext || 'unknown',
      mimeTypeDetected: fileTypeResult?.mime || 'unknown',
      uploadedAt: new Date(),
      containerBaseName: containerBaseName,
      storageAccountName: storageAccountName,
      processingStatus: 'pending',
      isPublic: false,
      accessLevel: 'registered',
      versionNumber: 1,
      isLatestVersion: true,
      expiresAt: null,
      retentionPolicy: 'default'
    };

    return fileMetadata;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('File upload failed');
  }
};

export const createBinaryObjectRecord = async (
  fileMetadata: BinaryObjectMetadata,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<string> => {
  try {
    await transactionClient.insert(BinaryObjectTable).values({
      binaryObjectId: fileMetadata.binaryObjectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mimeType: fileMetadata.mimeType,
      originalFileName: fileMetadata.originalFileName,
      fileSize: fileMetadata.fileSize.toString(),
      containerName: fileMetadata.containerName,
      blobName: fileMetadata.blobName,
      metadata: JSON.parse(JSON.stringify(fileMetadata)),
      blobUrl: fileMetadata.blobUrl,
      storageAccountName: fileMetadata.storageAccountName
    });

    return fileMetadata.binaryObjectId;
  } catch (error) {
    console.error('Error inserting binary object record:', error);
    throw new Error('Failed to insert binary object record');
  }
};

export const findBinaryObjectById = async (
  binaryObjectId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<typeof BinaryObjectTable.$inferSelect | null> => {
  const result = await transactionClient
    .select()
    .from(BinaryObjectTable)
    .where(eq(BinaryObjectTable.binaryObjectId, binaryObjectId))
    .limit(1);

  return result[0] || null;
};
