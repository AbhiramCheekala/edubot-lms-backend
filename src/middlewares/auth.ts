/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO remove eslint-disable
import passport from 'passport';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { NextFunction, Request, Response } from 'express';
import { User } from '../db/schema/index.js';

const verifyCallback =
  (
    req: Request,
    resolve: (value?: unknown) => void,
    reject: (reason?: unknown) => void,
    requiredRights: string[]
  ) =>
  async (err: unknown, user: User | false, info: unknown) => {
    if (err || info || !user) {
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
    }
    req.user = user;

    // if (requiredRights.length) {
    //   const userRights = roleRights.get(user.role) ?? [];
    //   const hasRequiredRights = requiredRights.every((requiredRight) =>
    //     userRights.includes(requiredRight)
    //   );
    //   if (!hasRequiredRights && req.params.userId !== user.id) {
    //     return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    //   }
    // }

    resolve();
  };

const auth =
  (...requiredRights: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    next();
    // return new Promise((resolve, reject) => {
    //   passport.authenticate(
    //     'jwt',
    //     { session: false },
    //     verifyCallback(req, resolve, reject, requiredRights)
    //   )(req, res, next);
    // })
    //   .then(() => next())
    //   .catch((err) => next(err));
  };

export default auth;

// get role from token
// find permission set name for that role from rolestable
// find permission set from code
// requiredRights will be specified for the route to the middleware
// can be something like, { action, identifier}
// identifier can be used to set the effective permission for that action in req.allowedActions
// as an object with identifier as key like canViewUsers: { scope }
// this way we can provide list of requiredrights at route top level that will be needed anywhere in the route
// so no need for any parsing internally just lookup with identifier and find the scope
