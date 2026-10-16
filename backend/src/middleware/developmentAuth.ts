import { Request, Response, NextFunction } from 'express';
import Development, { IDevelopment } from '../models/Development';
import DevelopmentMembership from '../models/DevelopmentMembership';
import Agency from '../models/Agency';
import { IUser } from '../models/User';
import { getObjectIdParam } from '../utils/validateParams';
import { createLogger } from '../utils/logger';
import {
  roleHasPermission,
  type DevelopmentRole,
  type DevelopmentPermission,
} from '../config/developments';

const log = createLogger('DevelopmentAuth');

// Extend Express Request with the resolved development context.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      development?: IDevelopment;
      developmentRole?: DevelopmentRole;
    }
  }
}

/** Platform staff get owner-level access for support/moderation. */
const isPlatformAdmin = (user: IUser): boolean => {
  const roles = user.availableRoles ?? [];
  return (
    roles.includes('admin') ||
    roles.includes('super_admin') ||
    user.role === 'admin' ||
    user.role === 'super_admin'
  );
};

/**
 * Resolve the caller's effective role on a development, or null if they have
 * none. Ownership is the only implicit grant; everything else comes from an
 * explicit, active membership. Owning a Property that references a unit grants
 * nothing here — that is the anti-capture rule.
 */
export const resolveDevelopmentRole = async (
  development: IDevelopment,
  user: IUser
): Promise<DevelopmentRole | null> => {
  const userId = String(user._id);

  if (isPlatformAdmin(user)) return 'owner';

  if (development.ownerType === 'user' && String(development.ownerId) === userId) {
    return 'owner';
  }

  // An agency-owned development is owned by whoever owns/admins that agency.
  if (development.ownerType === 'agency' && development.agencyId) {
    const agency = await Agency.findById(development.agencyId)
      .select('ownerId admins')
      .lean();
    if (agency) {
      const isAgencyOwner = String(agency.ownerId) === userId;
      const isAgencyAdmin = (agency.admins ?? []).some(
        (adminId) => String(adminId) === userId
      );
      if (isAgencyOwner || isAgencyAdmin) return 'owner';
    }
  }

  const membership = await DevelopmentMembership.findOne({
    developmentId: development._id,
    userId: user._id,
    status: 'active',
  })
    .select('role')
    .lean();

  return membership ? (membership.role as DevelopmentRole) : null;
};

/**
 * Resource-scoped authorization for development dashboard routes. Mirrors
 * `agencyDashboardAuth`: validates `:developmentId`, loads the development,
 * resolves the caller's effective role, and attaches both to the request.
 * Must run AFTER `protect` (so `req.user` is present).
 *
 * This only establishes that the caller has SOME access. Per-action checks use
 * `requireDevelopmentPermission(...)` below.
 */
export const developmentAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const developmentId = getObjectIdParam(req, res, 'developmentId');
    if (!developmentId) return; // getObjectIdParam already sent 400

    const development = await Development.findOne({
      _id: developmentId,
      deletedAt: { $exists: false },
    });
    if (!development) {
      res.status(404).json({ message: 'Development not found' });
      return;
    }

    const role = await resolveDevelopmentRole(development, req.user as IUser);
    if (!role) {
      log.warn(
        `Unauthorized development access attempt by user ${String(
          (req.user as IUser)._id
        )} for development ${developmentId}`
      );
      res.status(403).json({
        message: 'You do not have permission to access this development',
      });
      return;
    }

    req.development = development;
    req.developmentRole = role;
    next();
  } catch (error) {
    log.error('Development auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Guard a route by a named permission. Use after `developmentAuth` has resolved
 * `req.developmentRole`. Keeps every mutation behind the shared permission
 * matrix so the frontend and backend cannot disagree about who may do what.
 */
export const requireDevelopmentPermission = (permission: DevelopmentPermission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.developmentRole;
    if (!role || !roleHasPermission(role, permission)) {
      res.status(403).json({
        message: 'You do not have permission to perform this action',
      });
      return;
    }
    next();
  };
};
