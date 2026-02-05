import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';

// Load allowed IPs from environment variable (comma-separated)
// Example: ADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8
const getWhitelistedIPs = (): string[] => {
  const defaultIPs = [
    '127.0.0.1', // Localhost for development
    '::1', // IPv6 localhost
    '::ffff:127.0.0.1', // IPv6-mapped IPv4 localhost
  ];

  const envIPs = process.env.ADMIN_ALLOWED_IPS;
  if (envIPs) {
    const customIPs = envIPs.split(',').map(ip => ip.trim()).filter(ip => ip);
    return [...defaultIPs, ...customIPs];
  }

  return defaultIPs;
};

// Load allowed domains from environment variable (comma-separated)
// Example: ADMIN_ALLOWED_DOMAINS=admin.balkanestateai.com
const getAllowedDomains = (): string[] => {
  const envDomains = process.env.ADMIN_ALLOWED_DOMAINS;
  if (envDomains) {
    return envDomains.split(',').map(d => d.trim().toLowerCase()).filter(d => d);
  }
  return [];
};

// Check if VPN/IP check should be skipped (for development)
const isVPNCheckDisabled = (): boolean => {
  return process.env.DISABLE_ADMIN_VPN_CHECK === 'true';
};

// Admin role check
const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Middleware to check if request is from whitelisted VPN IP or allowed domain
 */
export const checkVPNAccess = (req: Request, res: Response, next: NextFunction): void => {
  // Skip VPN check if disabled (development only!)
  if (isVPNCheckDisabled()) {
    apiLogger.info('⚠️ VPN check disabled via DISABLE_ADMIN_VPN_CHECK');
    next();
    return;
  }

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

  // Get request host/domain
  const host = (req.headers.host || '').toLowerCase().split(':')[0];

  // Admin access attempt

  // Check if domain is allowed
  const allowedDomains = getAllowedDomains();
  const isDomainAllowed = allowedDomains.length > 0 && allowedDomains.includes(host);

  if (isDomainAllowed) {
    apiLogger.info(`✅ Domain verified: ${host}`);
    next();
    return;
  }

  // Check if IP is whitelisted
  const whitelistedIPs = getWhitelistedIPs();
  const isIPWhitelisted = whitelistedIPs.some(allowedIP => {
    return clientIP === allowedIP || normalizedIP === allowedIP;
  });

  if (!isIPWhitelisted) {
    apiLogger.error('❌ Unauthorized access attempt');
    res.status(403).json({
      message: 'Access denied. Admin panel requires VPN connection or authorized domain.',
      error: 'ACCESS_DENIED',
      hint: 'Connect to authorized VPN or access via allowed domain.',
      yourIP: normalizedIP,
    });
    return;
  }

  apiLogger.info(`✅ VPN IP verified: ${clientIP}`);
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
    apiLogger.error('❌ Non-admin user attempted access');
    res.status(403).json({
      message: 'Access denied. Admin privileges required.',
      error: 'INSUFFICIENT_PERMISSIONS',
      userRole: user.role,
    });
    return;
  }

  // Admin access granted
  next();
};

/**
 * Combined middleware: VPN + Admin role check
 */
export const requireAdminAccess = [checkVPNAccess, checkAdminRole];

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

/**
 * Get current whitelist config (for admin viewing/debugging)
 */
export const getWhitelistConfig = (): { ips: string[]; domains: string[]; vpnCheckDisabled: boolean } => {
  return {
    ips: getWhitelistedIPs(),
    domains: getAllowedDomains(),
    vpnCheckDisabled: isVPNCheckDisabled(),
  };
};
