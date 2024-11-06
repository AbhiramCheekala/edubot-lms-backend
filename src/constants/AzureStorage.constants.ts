import { PublicAccessType } from '@azure/storage-blob';

export const ContentContainerTypes = {
  readingMaterialContent: 'reading-material-content',
  otherCourseContent: 'other-course-content',
  assignmentContent: 'assignment-content',
  submissionContent: 'submission-content'
} as const;

export const PublicAssetsContainerTypes = {
  publicAssets: 'public-assets',
  courseBanners: 'course-banners',
  programBanners: 'program-banners',
  studentProfilePictures: 'student-profile-pictures',
  userProfilePictures: 'user-profile-pictures'
} as const;

export const StorageAccounts = {
  edubotprod: 'edubotprod',
  edubotdev: 'edubotdev',
  edubotprodpublicassets: 'edubotprodpublicassets',
  edubotdevpublicassets: 'edubotdevpublicassets'
} as const;

export type ContentContainerType = keyof typeof ContentContainerTypes;
export type PublicAssetsContainerType = keyof typeof PublicAssetsContainerTypes;
// simple: create a new container with exact name provided in containerBaseName
// postfix-year-month: create a new container with name in containerBaseName and postfix with current year and month
export type NewContainerCreationStrategy = 'simple' | 'postfix-year-month';

type CommonBlobResolutionParams = {
  createIfNotExists: boolean;
  createionStrategy: NewContainerCreationStrategy;
  newContainerAccessType?: PublicAccessType;
};

interface ContentBlobResolutionParams extends CommonBlobResolutionParams {
  containerBaseName: ContentContainerType;
  storageAccountName: 'edubotprod' | 'edubotdev';
}

interface PublicBlobResolutionParams extends CommonBlobResolutionParams {
  containerBaseName: PublicAssetsContainerType;
  storageAccountName: 'edubotprodpublicassets' | 'edubotdevpublicassets';
}

export type BlobResolutionParams = ContentBlobResolutionParams | PublicBlobResolutionParams;
