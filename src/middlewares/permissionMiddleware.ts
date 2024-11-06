import { Request, Response, NextFunction } from 'express';
import { checkPermissionGuard, PermissionGuard } from '../permissions/PermissionGuards.js';

export function requirePermissions(guard: PermissionGuard) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.accountInfo || !req.accountInfo.permissionSet) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (checkPermissionGuard(req.accountInfo.permissionSet, guard)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  };
}
