import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';

// Whitelist of allowed VPN IP addresses for admin access
// TODO: Update these with your actual VPN IP addresses
const ADMIN_WHITELIST_IPS = [
  '127.0.0.1', // Localhost for development
  '::1', // IPv6 localhost
  '::ffff:127.0.0.1', // IPv6-mapped IPv4 localhost
  // Add your VPN IP addresses here, for example:
  '10.8.0.1',
  '192.168.1.100',
];

// Admin role check
const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Middleware to check if request is from whitelisted VPN IP
 */
export const checkVPNAccess = (req: Request, res: Response, next: NextFunction): void => {
  // Get client IP address
  const clientIP =
    req.ip ||
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown';

  // Extract IP from potential IPv6-mapped IPv4 format
  const normalizedIP = String(clientIP).replace('::ffff:', '');

  console.log(`🔐 Admin access attempt from IP: ${clientIP} (normalized: ${normalizedIP})`);

  // Check if IP is whitelisted
  const isWhitelisted = ADMIN_WHITELIST_IPS.some(allowedIP => {
    return clientIP === allowedIP || normalizedIP === allowedIP;
  });

  if (!isWhitelisted) {
    console.error(`❌ Unauthorized IP address: ${clientIP}`);
    res.status(403).json({
      message: 'Access denied. Admin panel requires VPN connection.',
      error: 'IP_NOT_WHITELISTED',
      hint: 'Please connect to the authorized VPN before accessing the admin panel.',
    });
    return;
  }

  console.log(`✅ VPN IP verified: ${clientIP}`);
  next();
};

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
    console.error(`❌ Non-admin user attempted access: ${user.email} (role: ${user.role})`);
    res.status(403).json({
      message: 'Access denied. Admin privileges required.',
      error: 'INSUFFICIENT_PERMISSIONS',
      userRole: user.role,
    });
    return;
  }

  console.log(`✅ Admin access granted: ${user.email}`);
  next();
};

/**
 * Combined middleware: VPN + Admin role check
 */
export const requireAdminAccess = [checkVPNAccess, checkAdminRole];

/**
 * Middleware to log admin actions for audit trail
 */
export const logAdminAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;

    console.log(`📝 ADMIN ACTION: ${action}`);
    console.log(`   User: ${user?.email || 'unknown'}`);
    console.log(`   IP: ${ip}`);
    console.log(`   Time: ${timestamp}`);
    console.log(`   Path: ${req.method} ${req.path}`);
    // console.log(`   Body: ${JSON.stringify(req.body).substring(0, 200)}`);

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

/**
 * Add IP to whitelist (temporary - for development)
 * In production, IPs should be managed via environment variables or database
 */
export const addIPToWhitelist = (ip: string): boolean => {
  if (!ADMIN_WHITELIST_IPS.includes(ip)) {
    ADMIN_WHITELIST_IPS.push(ip);
    console.log(`✅ Added IP to whitelist: ${ip}`);
    return true;
  }
  return false;
};

/**
 * Get current whitelist (for admin viewing)
 */
export const getWhitelist = (): string[] => {
  return [...ADMIN_WHITELIST_IPS];
};
