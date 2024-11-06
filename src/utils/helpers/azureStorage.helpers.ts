import { format } from 'date-fns';
import {
  BlobResolutionParams,
  ContentContainerType,
  ContentContainerTypes,
  PublicAssetsContainerType,
  PublicAssetsContainerTypes
} from '../../constants/AzureStorage.constants.js';
import config from '../../config/config.js';
import { BlobServiceClient } from '@azure/storage-blob';

export type StorageAccountName = keyof typeof config.azure.storageAccounts;

function generateContainerNamePostfixYearMonth(
  containerType: ContentContainerType | PublicAssetsContainerType
) {
  const containerTypeValue =
    containerType in ContentContainerTypes
      ? ContentContainerTypes[containerType as ContentContainerType]
      : containerType in PublicAssetsContainerTypes
        ? PublicAssetsContainerTypes[containerType as PublicAssetsContainerType]
        : null;

  if (!containerTypeValue) {
    return '';
  }
  const currentDate = new Date();
  const yearMonth = format(currentDate, 'yyyy-MM');
  const containerName = `${containerTypeValue}-${yearMonth}`;
  return containerName;
}

function getContainerNameSimple(containerType: ContentContainerType | PublicAssetsContainerType) {
  const containerTypeValue =
    containerType in ContentContainerTypes
      ? ContentContainerTypes[containerType as ContentContainerType]
      : containerType in PublicAssetsContainerTypes
        ? PublicAssetsContainerTypes[containerType as PublicAssetsContainerType]
        : null;

  if (!containerTypeValue) {
    return '';
  }
  return containerTypeValue;
}

class BlobServiceSingleton {
  private static instances: Record<string, BlobServiceClient> = {};

  private constructor() {}

  public static getInstance(accountName: string): BlobServiceClient {
    if (!BlobServiceSingleton.instances[accountName]) {
      console.info(`Creating BlobServiceClient instance for ${accountName}`);
      const connectionString =
        config.azure.storageAccounts[accountName as keyof typeof config.azure.storageAccounts];
      if (!connectionString) {
        throw new Error(`No connection string found for storage account: ${accountName}`);
      }
      BlobServiceSingleton.instances[accountName] =
        BlobServiceClient.fromConnectionString(connectionString);
    }
    return BlobServiceSingleton.instances[accountName];
  }
}

export async function getContainerClientByType(params: BlobResolutionParams) {
  const {
    containerBaseName,
    storageAccountName,
    createIfNotExists,
    createionStrategy,
    newContainerAccessType
  } = params;
  let containerName: string = getContainerNameSimple(containerBaseName);
  if (createionStrategy === 'postfix-year-month') {
    containerName = generateContainerNamePostfixYearMonth(containerBaseName);
  }
  if (!containerName) {
    throw new Error('Container name is not defined');
  }
  const blobServiceClient = BlobServiceSingleton.getInstance(storageAccountName);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const containerExists = await containerClient.exists();
  if (createIfNotExists) {
    if (!containerExists) {
      await containerClient.create({
        ...(newContainerAccessType ? { access: newContainerAccessType } : {})
      });
      console.log(`Container "${containerClient.containerName}" created in ${storageAccountName}.`);
    }
  } else if (!containerExists) {
    throw new Error(`Container "${containerName}" does not exist in ${storageAccountName}.`);
  }
  return {
    containerClient,
    containerName
  };
}

export async function getContainerClientByContainerName(
  containerName: string,
  storageAccountName: StorageAccountName
) {
  const blobServiceClient = BlobServiceSingleton.getInstance(storageAccountName);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  return {
    containerClient,
    containerName
  };
}

export function getPrivateContainerStorageAccountName() {
  switch (config.env) {
    case 'production':
      return 'edubotprod';
    case 'development':
      return 'edubotdev';
  }
}

export function getPublicContainerStorageAccountName() {
  switch (config.env) {
    case 'production':
      return 'edubotprodpublicassets';
    case 'development':
      return 'edubotdevpublicassets';
  }
}
