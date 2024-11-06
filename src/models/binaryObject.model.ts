import { eq } from 'drizzle-orm';
import { db } from '../db/db.js';
import {
  BinaryObject,
  BinaryObjectFull,
  BinaryObjectInsert,
  BinaryObjectTable
} from '../db/schema/binaryObject.schema.js';

export async function insertBinaryObject(
  binaryObject: BinaryObjectInsert,
  transactionClient: typeof db = db
): Promise<BinaryObjectFull> {
  const [newBinaryObject] = await transactionClient
    .insert(BinaryObjectTable)
    .values({ ...binaryObject, updatedAt: new Date().toISOString() })
    .returning();
  return newBinaryObject;
}

export async function queryBinaryObjectByField(
  field: Extract<keyof BinaryObject, 'binaryObjectId' | 'blobName'>,
  value: string,
  transactionClient: typeof db = db
): Promise<BinaryObjectFull> {
  const [binaryObject] = await transactionClient
    .select()
    .from(BinaryObjectTable)
    .where(eq(BinaryObjectTable[field], value))
    .limit(1);
  return binaryObject;
}
