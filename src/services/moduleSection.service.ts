import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import {
  ModuleSectionFull,
  ModuleSectionInsert,
  ModuleSectionJoined,
  ModuleSectionPartial
} from '../db/schema/moduleSection.schema.js';
import {
  defaultJoinOptions,
  insertModuleSection,
  JoinOptions,
  queryModuleSectionByField,
  updateModuleSection
} from '../models/moduleSection.model.js';

export const createModuleSection = async (
  moduleSection: ModuleSectionInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ModuleSectionFull> => {
  const newModuleSection = await insertModuleSection(moduleSection, transactionClient);
  return newModuleSection;
};

export const findModuleSectionById = async (
  moduleSectionId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ModuleSectionJoined | null> => {
  const moduleSection = await queryModuleSectionByField(
    'moduleSectionId',
    moduleSectionId,
    joinOptions,
    transactionClient
  );
  return moduleSection as ModuleSectionJoined | null;
};

export const modifyModuleSection = async (
  moduleSectionId: string,
  updateData: Pick<ModuleSectionInsert, 'title'>,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ModuleSectionPartial> => {
  const updatedModuleSection = await updateModuleSection(
    moduleSectionId,
    updateData,
    transactionClient
  );
  return updatedModuleSection;
};
