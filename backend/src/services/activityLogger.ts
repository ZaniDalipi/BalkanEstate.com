import { Request } from 'express';
import ActivityLog, { ActivityCategory, ActivitySeverity } from '../models/ActivityLog';

/**
 * Activity Logger Service
 *
 * Centralized logging service for important operational events.
 * Stores data in MongoDB for admin dashboard and daily email reports.
 */

interface LogOptions {
  category: ActivityCategory;
  action: string;
  severity?: ActivitySeverity;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  req?: Request;
}

class ActivityLogger {
  /**
   * Log an activity event
   */
  async log(options: LogOptions): Promise<void> {
    try {
      const {
        category,
        action,
        severity = 'info',
        userId,
        userEmail,
        metadata = {},
        req,
      } = options;

      await ActivityLog.create({
        category,
        action,
        severity,
        userId,
        userEmail,
        metadata,
        ipAddress: req ? this.getClientIp(req) : undefined,
        userAgent: req?.headers['user-agent'],
      });
    } catch {
      // Silently fail - logging should never break the app
    }
  }

  /**
   * Get client IP from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  // ============ AUTH EVENTS ============

  async logLogin(userId: string, email: string, req?: Request): Promise<void> {
    await this.log({
      category: 'auth',
      action: 'user_login',
      userId,
      userEmail: email,
      req,
    });
  }

  async logLoginFailed(email: string, reason: string, req?: Request): Promise<void> {
    await this.log({
      category: 'auth',
      action: 'login_failed',
      severity: 'warning',
      userEmail: email,
      metadata: { reason },
      req,
    });
  }

  async logSignup(userId: string, email: string, role: string, req?: Request): Promise<void> {
    await this.log({
      category: 'auth',
      action: 'user_signup',
      userId,
      userEmail: email,
      metadata: { role },
      req,
    });
  }

  async logLogout(userId: string, email: string, req?: Request): Promise<void> {
    await this.log({
      category: 'auth',
      action: 'user_logout',
      userId,
      userEmail: email,
      req,
    });
  }

  async logPasswordReset(email: string, req?: Request): Promise<void> {
    await this.log({
      category: 'auth',
      action: 'password_reset_requested',
      userEmail: email,
      req,
    });
  }

  // ============ SUBSCRIPTION EVENTS ============

  async logSubscriptionCreated(
    userId: string,
    email: string,
    planName: string,
    amount: number,
    currency: string,
    expiresAt: Date,
    transactionId?: string
  ): Promise<void> {
    await this.log({
      category: 'subscription',
      action: 'subscription_created',
      userId,
      userEmail: email,
      metadata: {
        planName,
        amount,
        currency,
        expiresAt,
        transactionId,
      },
    });
  }

  async logSubscriptionCanceled(
    userId: string,
    email: string,
    planName: string,
    willExpireAt?: Date
  ): Promise<void> {
    await this.log({
      category: 'subscription',
      action: 'subscription_canceled',
      severity: 'warning',
      userId,
      userEmail: email,
      metadata: {
        planName,
        willExpireAt,
      },
    });
  }

  async logSubscriptionExpired(userId: string, email: string, planName: string): Promise<void> {
    await this.log({
      category: 'subscription',
      action: 'subscription_expired',
      severity: 'warning',
      userId,
      userEmail: email,
      metadata: { planName },
    });
  }

  async logPaymentFailed(
    userId: string,
    email: string,
    transactionId: string,
    reason?: string
  ): Promise<void> {
    await this.log({
      category: 'subscription',
      action: 'payment_failed',
      severity: 'error',
      userId,
      userEmail: email,
      metadata: { transactionId, reason },
    });
  }

  async logRefund(
    userId: string,
    email: string,
    amount: number,
    currency: string,
    transactionId: string,
    reason?: string
  ): Promise<void> {
    await this.log({
      category: 'subscription',
      action: 'refund_processed',
      severity: 'warning',
      userId,
      userEmail: email,
      metadata: { amount, currency, transactionId, reason },
    });
  }

  // ============ SECURITY EVENTS ============

  async logSuspiciousActivity(
    action: string,
    details: Record<string, any>,
    req?: Request
  ): Promise<void> {
    await this.log({
      category: 'security',
      action: `suspicious_${action}`,
      severity: 'warning',
      metadata: details,
      req,
    });
  }

  async logUnauthorizedAccess(
    resource: string,
    userId?: string,
    email?: string,
    req?: Request
  ): Promise<void> {
    await this.log({
      category: 'security',
      action: 'unauthorized_access',
      severity: 'warning',
      userId,
      userEmail: email,
      metadata: { resource },
      req,
    });
  }

  async logRateLimitExceeded(endpoint: string, req?: Request): Promise<void> {
    await this.log({
      category: 'security',
      action: 'rate_limit_exceeded',
      severity: 'warning',
      metadata: { endpoint },
      req,
    });
  }

  // ============ CHAT EVENTS ============

  async logChatConnection(userId: string): Promise<void> {
    await this.log({
      category: 'chat',
      action: 'user_connected',
      userId,
    });
  }

  async logChatDisconnection(userId: string): Promise<void> {
    await this.log({
      category: 'chat',
      action: 'user_disconnected',
      userId,
    });
  }

  async logChatUnauthorized(
    userId: string,
    conversationId: string,
    action: string
  ): Promise<void> {
    await this.log({
      category: 'chat',
      action: 'unauthorized_chat_action',
      severity: 'warning',
      userId,
      metadata: { conversationId, attemptedAction: action },
    });
  }

  // ============ SYSTEM EVENTS ============

  async logSystemError(error: string, context?: Record<string, any>): Promise<void> {
    await this.log({
      category: 'system',
      action: 'system_error',
      severity: 'error',
      metadata: { error, ...context },
    });
  }

  async logSystemStartup(): Promise<void> {
    await this.log({
      category: 'system',
      action: 'server_started',
      metadata: {
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // ============ ADMIN EVENTS ============

  async logAdminAction(
    adminId: string,
    adminEmail: string,
    action: string,
    targetUserId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      category: 'admin',
      action: `admin_${action}`,
      userId: adminId,
      userEmail: adminEmail,
      metadata: { targetUserId, ...details },
    });
  }

  // ============ QUERY METHODS ============

  /**
   * Get activity summary for the last 24 hours
   */
  async getDailySummary(): Promise<{
    totalEvents: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    recentCritical: any[];
    newSignups: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    failedPayments: number;
    refunds: number;
    securityEvents: number;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      categoryAgg,
      severityAgg,
      recentCritical,
      newSignups,
      newSubscriptions,
      canceledSubscriptions,
      failedPayments,
      refunds,
      securityEvents,
    ] = await Promise.all([
      ActivityLog.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      ActivityLog.find({
        createdAt: { $gte: oneDayAgo },
        severity: 'critical',
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ActivityLog.countDocuments({
        createdAt: { $gte: oneDayAgo },
        action: 'user_signup',
      }),
      ActivityLog.countDocuments({
        createdAt: { $gte: oneDayAgo },
        action: 'subscription_created',
      }),
      ActivityLog.countDocuments({
        createdAt: { $gte: oneDayAgo },
        action: 'subscription_canceled',
      }),
      ActivityLog.countDocuments({
        createdAt: { $gte: oneDayAgo },
        action: 'payment_failed',
      }),
      ActivityLog.countDocuments({
        createdAt: { $gte: oneDayAgo },
        action: 'refund_processed',
      }),
      ActivityLog.countDocuments({
        createdAt: { $gte: oneDayAgo },
        category: 'security',
      }),
    ]);

    return {
      totalEvents,
      byCategory: Object.fromEntries(categoryAgg.map((c: any) => [c._id, c.count])),
      bySeverity: Object.fromEntries(severityAgg.map((s: any) => [s._id, s.count])),
      recentCritical,
      newSignups,
      newSubscriptions,
      canceledSubscriptions,
      failedPayments,
      refunds,
      securityEvents,
    };
  }

  /**
   * Get paginated activity logs with filters
   */
  async getLogs(options: {
    category?: ActivityCategory;
    severity?: ActivitySeverity;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ logs: any[]; total: number; pages: number }> {
    const {
      category,
      severity,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const query: any = {};

    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger();
export default activityLogger;
