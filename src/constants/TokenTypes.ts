export const TokenTypes = {
  access: 'ACCESS',
  refresh: 'REFRESH',
  resetPassword: 'RESET_PASSWORD',
  verifyEmail: 'VERIFY_EMAIL'
} as const;

export type TokenType = keyof typeof TokenTypes;
export type TokenTypeValue = (typeof TokenTypes)[TokenType];
