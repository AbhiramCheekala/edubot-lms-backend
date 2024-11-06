import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, Schema } from '../db/db.js';
import { ModuleInsert, ModuleJoined, ModulePartial } from '../db/schema/module.schema.js';
import {
  defaultJoinOptions,
  insertModule,
  JoinOptions,
  queryAllModulesByCourse,
  queryModuleByField,
  updateModule
} from '../models/module.model.js';
import {
  deleteAllSectionsForModule,
  deleteModuleAndSectionMapping,
  insertModuleAndSectionMapping,
  queryLastSectionPositionForModule
} from '../models/moduleAndSectionMappings.model.js';
import { ResolvedSecurityFilters } from '../permissions/securityFilterTypes.js';

export const findAllModulesForCourse = async (
  courseId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters
): Promise<ModuleJoined[]> => {
  const modules = await queryAllModulesByCourse(
    courseId,
    joinOptions,
    transactionClient,
    securityFilters
  );
  return modules as ModuleJoined[];
};

export async function findModuleById(
  moduleId: string,
  joinOptions: JoinOptions = defaultJoinOptions,
  transactionClient: NodePgDatabase<Schema> = db,
  securityFilters?: ResolvedSecurityFilters
): Promise<ModulePartial | null> {
  const module = await queryModuleByField(
    'moduleId',
    moduleId,
    joinOptions,
    transactionClient,
    securityFilters
  );
  return module as ModulePartial | null;
}

export const createModule = async (
  {
    module
  }: {
    module: ModuleInsert;
  },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<ModulePartial> => {
  const newModule = await insertModule(module, transactionClient);
  return newModule;
};

export const modifyModuleById = async (
  moduleId: string,
  transactionClient: NodePgDatabase<Schema> = db,
  {
    module
  }: {
    module: ModuleInsert;
  }
): Promise<ModulePartial> => {
  const updatedModule = await updateModule(moduleId, module, transactionClient);
  return updatedModule as ModulePartial;
};

export async function addSectionMappings(
  params: { sectionIds: string[]; moduleId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  const lastPosition =
    (await queryLastSectionPositionForModule(params.moduleId, transactionClient)) ?? 0;
  for (let i = 0; i < params.sectionIds.length; i++) {
    await insertModuleAndSectionMapping(
      {
        moduleId: params.moduleId,
        moduleSectionId: params.sectionIds[i],
        position: lastPosition + 1 + i
      },
      transactionClient
    );
  }
}

export async function removeSectionMappings(
  params: { sectionIds: string[]; moduleId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  for (let i = 0; i < params.sectionIds.length; i++) {
    await deleteModuleAndSectionMapping(params.moduleId, params.sectionIds[i], transactionClient);
  }
}

export async function updateSectionMappings(
  params: { sectionIds: string[]; moduleId: string },
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await deleteAllSectionsForModule(params.moduleId, transactionClient);
  for (let i = 0; i < params.sectionIds.length; i++) {
    await insertModuleAndSectionMapping(
      {
        moduleId: params.moduleId,
        moduleSectionId: params.sectionIds[i],
        position: i
      },
      transactionClient
    );
  }
}
