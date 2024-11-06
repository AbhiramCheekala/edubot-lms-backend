import { Token } from '../db/schema/token.schema.ts';

export interface TokenResponse {
  token: string;
  expires: Date;
  tokenDbRecord?: Token;
}

export interface AuthTokensResponse {
  access: TokenResponse;
  refresh?: TokenResponse;
}
