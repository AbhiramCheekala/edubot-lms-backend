import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { ContentGroupPartial } from '../db/schema/contentGroup.schema.js';
import {
  deleteContentAndGroupMap,
  deleteAllContentForGroup,
  insertContentAndGroupMap,
  queryLastContentPositionForGroup
} from '../models/contentAndGroupMap.model.js';
import {
  defaultJoinOptions,
  insertContentGroup,
  JoinOptions,
  queryContentGroupByField
} from '../models/contentGroup.model.js';

export const createContentGroup = async (
  contentIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ContentGroupPartial> => {
  const newContentGroup = await insertContentGroup({}, transactionClient);
  addContentToGroup(newContentGroup.contentGroupId, contentIds, transactionClient);
  return newContentGroup as ContentGroupPartial;
};

export const findContentGroup = async (
  contentGroupId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ContentGroupPartial> => {
  const contentGroup = await queryContentGroupByField(
    'contentGroupId',
    contentGroupId,
    joinOptions,
    transactionClient
  );
  return contentGroup as ContentGroupPartial;
};

export const updateContentGroup = async (
  contentGroupId: string,
  contentIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> => {
  await deleteAllContentForGroup(contentGroupId, transactionClient);
  await addContentToGroup(contentGroupId, contentIds, transactionClient);
};

export const addContentToGroup = async (
  contentGroupId: string,
  contentIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> => {
  const lastPosition =
    (await queryLastContentPositionForGroup(contentGroupId, transactionClient)) ?? 0;
  for (let i = 0; i < contentIds.length; i++) {
    await insertContentAndGroupMap(
      { contentId: contentIds[i], contentGroupId, position: lastPosition + 1 + i },
      transactionClient
    );
  }
};

export const removeContentFromGroup = async (
  contentGroupId: string,
  contentIds: string[],
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> => {
  for (const contentId of contentIds) {
    await deleteContentAndGroupMap(contentId, contentGroupId, transactionClient);
  }
};

export const removeAllContentFromGroup = async (
  contentGroupId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> => {
  await deleteAllContentForGroup(contentGroupId, transactionClient);
};
