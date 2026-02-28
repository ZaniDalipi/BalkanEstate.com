import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';

// Admin role check
const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Middleware to check if user is admin
 */
export const checkAdminRole = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED',
    });
    return;
  }

  const user = req.user as IUser;

  // Check if user has admin role
  const isAdmin = ADMIN_ROLES.includes(user.role);

  if (!isAdmin) {
    apiLogger.error(`❌ Non-admin user attempted access (role: ${user.role})`);
    res.status(403).json({
      message: 'Access denied. Admin privileges required.',
      error: 'INSUFFICIENT_PERMISSIONS',
    });
    return;
  }

  // Admin access granted
  next();
};

/**
 * Middleware to log admin actions for audit trail
 */
export const logAdminAction = (_action: string) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Admin action logged: ${_action}
    // apiLogger.info(`   Body: ${JSON.stringify(req.body).substring(0, 200)}`);

    // TODO: Store in database for audit trail
    // await AdminAuditLog.create({
    //   action,
    //   userId: user._id,
    //   userEmail: user.email,
    //   ip,
    //   timestamp,
    //   method: req.method,
    //   path: req.path,
    //   body: req.body,
    // });

    next();
  };
};
