import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import User from '../models/User';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SeedDevAdmin');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

log.info(`🌍 Environment: ${env.toUpperCase()}`);

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY VALIDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Get credentials from environment variables (NO DEFAULTS for security)
const adminEmail = process.env.DEV_ADMIN_EMAIL;
const adminPassword = process.env.DEV_ADMIN_PASSWORD;
const adminRole = (process.env.DEV_ADMIN_ROLE === 'super_admin' ? 'super_admin' : 'admin') as 'admin' | 'super_admin';
const confirmProduction = process.env.CONFIRM_PRODUCTION;

// Require explicit email - no defaults
if (!adminEmail) {
  log.error('❌ Error: DEV_ADMIN_EMAIL environment variable is required');
  log.error('   Usage: DEV_ADMIN_EMAIL=your@email.com DEV_ADMIN_PASSWORD=yourpassword npm run seed:dev-admin');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(adminEmail)) {
  log.error('❌ Error: Invalid email format');
  process.exit(1);
}

// Require password
if (!adminPassword) {
  log.error('❌ Error: DEV_ADMIN_PASSWORD environment variable is required');
  log.error('   Usage: DEV_ADMIN_EMAIL=your@email.com DEV_ADMIN_PASSWORD=yourpassword npm run seed:dev-admin');
  log.error('   For super_admin: Add DEV_ADMIN_ROLE=super_admin');
  process.exit(1);
}

// Strong password requirements
const passwordErrors: string[] = [];
if (adminPassword.length < 12) {
  passwordErrors.push('At least 12 characters');
}
if (!/[A-Z]/.test(adminPassword)) {
  passwordErrors.push('At least one uppercase letter');
}
if (!/[a-z]/.test(adminPassword)) {
  passwordErrors.push('At least one lowercase letter');
}
if (!/[0-9]/.test(adminPassword)) {
  passwordErrors.push('At least one number');
}
if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(adminPassword)) {
  passwordErrors.push('At least one special character (!@#$%^&*...)');
}

if (passwordErrors.length > 0) {
  log.error('❌ Error: Password does not meet security requirements:');
  passwordErrors.forEach(err => log.error(`   - ${err}`));
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

// Create audit log schema if it doesn't exist
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  targetEmail: { type: String, required: true },
  targetRole: { type: String, required: true },
  performedBy: { type: String, default: 'system-script' },
  environment: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  checksum: { type: String, required: true }, // Integrity verification
  metadata: {
    hostname: String,
    nodeVersion: String,
    scriptVersion: String,
  }
}, { collection: 'admin_audit_logs' });

const AuditLog = mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', auditLogSchema);

// Generate checksum for audit log integrity
function generateChecksum(data: object): string {
  const secret = process.env.AUDIT_SECRET || 'default-audit-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
}

async function logAuditEvent(action: string, email: string, role: string) {
  const auditData = {
    action,
    targetEmail: email,
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

const DEV_ADMIN = {
  email: adminEmail,
  password: adminPassword,
  name: adminRole === 'super_admin' ? 'Super Admin' : 'Admin',
  role: adminRole,
  availableRoles: ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'] as const,
  activeRole: adminRole,
  primaryRole: adminRole,
  isEmailVerified: true,
  provider: 'local' as const,
  subscription: {
    tier: 'pro' as const,
    status: 'active' as const,
    listingsLimit: 999,
    activeListingsCount: 0,
    privateSellerCount: 0,
    agentCount: 0,
    promotionCoupons: {
      monthly: 99,
      available: 99,
      used: 0,
      rollover: 0,
      lastRefresh: new Date(),
    },
    savedSearchesLimit: -1,
    totalPaid: 0,
  },
  activeListingsLimit: 999,
};

async function seedDevAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      log.error('❌ Error: MONGO_URI or MONGODB_URI environment variable is required');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Rate limiting: Check if admin was created/modified in last 5 minutes
    const recentAudit = await AuditLog.findOne({
      targetEmail: DEV_ADMIN.email,
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (recentAudit) {
      log.error('❌ Error: Rate limit exceeded');
      log.error('   An admin action was performed for this email in the last 5 minutes');
      log.error('   Please wait before trying again');
      process.exit(1);
    }

    // Check if admin already exists
    let user = await User.findOne({ email: DEV_ADMIN.email });

    if (user) {
      log.info(`\n📝 Found existing user: ${user.email}`);
      log.info(`   Current role: ${user.role}`);

      // Update role
      if (user.role !== adminRole) {
        user.role = adminRole;
        user.availableRoles = ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'];
        user.activeRole = adminRole;
        user.primaryRole = adminRole;
        await user.save();
        await logAuditEvent('ROLE_UPDATED', user.email, adminRole);
        log.info(`✅ Updated user role to: ${adminRole}`);
      } else {
        log.info(`✓ User already has ${adminRole} role`);
      }

      // Update password
      user.password = DEV_ADMIN.password;
      await user.save();
      await logAuditEvent('PASSWORD_UPDATED', user.email, adminRole);
      log.info(`✅ Password updated`);
    } else {
      // Create new admin user
      user = await User.create(DEV_ADMIN);
      await logAuditEvent('ADMIN_CREATED', DEV_ADMIN.email, adminRole);
      log.info(`\n✅ Created new admin user`);
    }

    log.info('\n═══════════════════════════════════════════');
    log.info(adminRole === 'super_admin' ? '       👑 SUPER ADMIN READY' : '       🔐 ADMIN READY');
    log.info('═══════════════════════════════════════════');
    log.info(`   Email:    ${DEV_ADMIN.email}`);
    log.info(`   Password: ********** (secured)`);
    log.info(`   Role:     ${user.role}`);
    log.info('═══════════════════════════════════════════');
    log.info('\n🌐 Admin panel: /admin');
    log.info('');

  } catch (error) {
    log.error('❌ Error seeding admin:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedDevAdmin();
