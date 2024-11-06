import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { User } from '../db/schema/user.schema.js';
import { PermissionSetName, PermissionSets } from '../permissions/PermissionSets.js';
import { TokenCustomData, TokenPayload } from '../services/token.service.js'; // Adjust the import path as needed

export interface TokenStudentObject {
  apsche: boolean;
  batchId: string;
  contactPhoneNumber: { number: string; countryCode: string };
  dateOfBirth: string;
  gender: string;
  givenStudentId: string;
  id: string;
  isActive: boolean;
  joiningDate: string;
  name: string;
  orgId: string;
  personalEmail: string;
}

interface AccountInfo {
  accountType: 'user' | 'student';
  email: string;
  role: string;
  loginId: string;
  permissionSet: (typeof PermissionSets)[PermissionSetName];
  customData: TokenCustomData;
  student?: TokenStudentObject;
  user?: User;
}

declare module 'express-serve-static-core' {
  interface Request {
    accountInfo?: AccountInfo;
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const bearerHeader = req.headers['authorization'];

  if (!bearerHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const bearer = bearerHeader.split(' ');
  const bearerToken = bearer[1];

  try {
    const decoded = jwt.verify(bearerToken, config.jwt.secret) as unknown as TokenPayload;

    // Populate request object with account info
    req.accountInfo = {
      accountType: decoded.accountType,
      email: decoded.email,
      role: decoded.role,
      loginId: decoded.loginId,
      permissionSet:
        PermissionSets[decoded.customData.permissionSetName as PermissionSetName] ||
        PermissionSets.RegularUser,
      customData: decoded.customData,
      ...(decoded.student ? { student: decoded.student } : {}),
      ...(decoded.user ? { user: decoded.user } : {})
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
