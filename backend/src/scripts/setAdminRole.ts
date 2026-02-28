import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import User from '../models/User';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SetAdminRole');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

log.info(`🌍 Environment: ${env.toUpperCase()}`);

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY VALIDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Get email from environment variable (NO DEFAULTS)
const email = process.env.SET_ADMIN_EMAIL;
const targetRole = (process.env.SET_ADMIN_ROLE === 'super_admin' ? 'super_admin' : 'admin') as 'admin' | 'super_admin';
const confirmProduction = process.env.CONFIRM_PRODUCTION;

// Require explicit email
if (!email) {
  log.error('❌ Error: SET_ADMIN_EMAIL environment variable is required');
  log.error('   Usage: SET_ADMIN_EMAIL=user@example.com npm run set-admin');
  log.error('   For super_admin: SET_ADMIN_EMAIL=user@example.com SET_ADMIN_ROLE=super_admin npm run set-admin');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  log.error('❌ Error: Invalid email format');
  process.exit(1);
}

// Production safety check
if (env === 'production' && confirmProduction !== 'yes') {
  log.error('❌ Error: Production environment requires explicit confirmation');
  log.error('   Add CONFIRM_PRODUCTION=yes to proceed');
  log.error('   ⚠️  This will modify the production database!');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  targetEmail: { type: String, required: true },
  targetRole: { type: String, required: true },
  performedBy: { type: String, default: 'system-script' },
  environment: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  checksum: { type: String, required: true },
  metadata: {
    hostname: String,
    nodeVersion: String,
    scriptVersion: String,
  }
}, { collection: 'admin_audit_logs' });

const AuditLog = mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', auditLogSchema);

function generateChecksum(data: object): string {
  const secret = process.env.AUDIT_SECRET || 'default-audit-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
}

async function logAuditEvent(action: string, targetEmail: string, role: string) {
  const auditData = {
    action,
    targetEmail,
    targetRole: role,
    environment: env,
    timestamp: new Date(),
    metadata: {
      hostname: require('os').hostname(),
      nodeVersion: process.version,
      scriptVersion: '2.0.0',
    }
  };

  const checksum = generateChecksum(auditData);

  await AuditLog.create({
    ...auditData,
    checksum,
  });

  log.info(`📋 Audit log created: ${action}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

const setAdminRole = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      log.error('❌ Error: MONGO_URI or MONGODB_URI environment variable is required');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Rate limiting: Check if admin was modified in last 5 minutes
    const recentAudit = await AuditLog.findOne({
      targetEmail: email,
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (recentAudit) {
      log.error('❌ Error: Rate limit exceeded');
      log.error('   An admin action was performed for this email in the last 5 minutes');
      log.error('   Please wait before trying again');
      process.exit(1);
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      log.error(`❌ User not found: ${email}`);
      log.info('Please create this user first or use seedDevAdmin script.');
      process.exit(1);
    }

    log.info(`\n📝 Found user: ${user.name} (${user.email})`);
    log.info(`   Current role: ${user.role}`);

    // Update role
    if (user.role === targetRole) {
      log.info(`✓ User already has ${targetRole} role`);
    } else {
      const previousRole = user.role;
      user.role = targetRole;
      user.availableRoles = ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'];
      user.activeRole = targetRole;
      user.primaryRole = targetRole;
      await user.save();
      await logAuditEvent('ROLE_PROMOTED', user.email, targetRole);
      log.info(`✅ Updated user role: ${previousRole} → ${targetRole}`);
    }

    log.info('\n═══════════════════════════════════════════');
    log.info(targetRole === 'super_admin' ? '       👑 SUPER ADMIN ACCESS GRANTED' : '       🔐 ADMIN ACCESS GRANTED');
    log.info('═══════════════════════════════════════════');
    log.info(`   Email: ${user.email}`);
    log.info(`   Role:  ${user.role}`);
    log.info('═══════════════════════════════════════════');
    log.info('\n🌐 Admin panel: /admin');

    process.exit(0);
  } catch (error) {
    log.error('❌ Error:', error);
    process.exit(1);
  }
};

setAdminRole();
