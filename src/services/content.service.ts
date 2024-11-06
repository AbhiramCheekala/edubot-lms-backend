import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { ContentInsert, ContentJoined, ContentPartial } from '../db/schema/content.schema.js';
import { insertContent, queryContentByField } from '../models/content.model.js';

export const createLinkTypeContent = async (
  content: Omit<ContentInsert, 'binaryObjectRef'>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ContentPartial> => {
  const newContent = await insertContent(content, transactionClient);
  return newContent as ContentPartial;
};

export const createFileTypeContent = async (
  content: Omit<ContentInsert, 'url'>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ContentPartial> => {
  const newContent = await insertContent(content, transactionClient);
  return newContent as ContentPartial;
};

export const getContentById = async (
  contentId: string,
  joinOptions: { includeBinaryObject: boolean } = { includeBinaryObject: false },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ContentJoined> => {
  const content = await queryContentByField('contentId', contentId, joinOptions, transactionClient);
  return content as ContentJoined;
};
