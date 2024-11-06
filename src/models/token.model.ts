import { db, Schema } from '../db/db.js';
import { and, desc, eq, getTableColumns } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn } from 'drizzle-orm/pg-core';
import { Token, TokenInsert, TokenTable } from '../db/schema/token.schema.js';
import { TokenTypeValue } from '../constants/TokenTypes.js';

export async function insertToken(
  token: TokenInsert,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Token> {
  const [newToken] = await transactionClient
    .insert(TokenTable)
    .values({ ...token })
    .returning(getSanatizedSelectColumns());
  return newToken as Token;
}

export async function deleteToken(
  token: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<void> {
  await transactionClient.delete(TokenTable).where(eq(TokenTable.token, token));
}

export async function getTokenByToken(
  token: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Token> {
  const tokenDetails = await transactionClient
    .select()
    .from(TokenTable)
    .where(eq(TokenTable.token, token))
    .limit(1);
  return tokenDetails[0];
}

export async function getTokensByUserAndType(
  loginId: string,
  tokenType: TokenTypeValue,
  limit: number = 10,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Token[]> {
  const tokens = await transactionClient
    .select()
    .from(TokenTable)
    .where(and(eq(TokenTable.loginId, loginId), eq(TokenTable.type, tokenType)))
    .orderBy(desc(TokenTable.createdAt))
    .limit(limit);
  return tokens;
}

export async function getTokensByUser(
  loginId: string,
  transactionClient: NodePgDatabase<Schema> = db
): Promise<Token[]> {
  const tokenDetails = await transactionClient
    .select()
    .from(TokenTable)
    .where(eq(TokenTable.loginId, loginId));
  return tokenDetails;
}

function getSanatizedSelectColumns(
  selectColumns?: Record<string, PgColumn>
): Record<string, PgColumn> {
  return selectColumns ? selectColumns : getTableColumns(TokenTable);
}
