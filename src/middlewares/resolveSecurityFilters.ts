// securityFilterMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import {
  ResolvedSecurityFilters,
  SecurityFilterContext,
  SecurityFilterParam
} from '../permissions/securityFilterTypes.js';
import { getPermissionScopes } from '../permissions/PermissionUtils.js';

export function resolveSecurityFilters(params: SecurityFilterParam[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.accountInfo || !req.accountInfo.permissionSet) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resolvedFilters: ResolvedSecurityFilters = {};

    const context: SecurityFilterContext = {
      loginId: req.accountInfo.loginId,
      accountType: req.accountInfo.accountType,
      ...(req.accountInfo.student ? { studentId: req.accountInfo.student.id } : {}),
      ...(req.accountInfo.user ? { userId: req.accountInfo.user.id } : {})
      // Add any other context properties you want to include
    };

    params.forEach((param: SecurityFilterParam) => {
      const scopes = getPermissionScopes(req.accountInfo!.permissionSet, param.action);
      resolvedFilters[param.identifier] = {
        scopes,
        context
      };
    });

    req.securityFilters = resolvedFilters;
    next();
  };
}
