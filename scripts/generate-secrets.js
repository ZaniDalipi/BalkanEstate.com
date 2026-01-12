#!/usr/bin/env node

/**
 * Secure Key Generator for BalkanEstate
 *
 * Generates all required security keys and outputs them in a format
 * ready for Railway or local .env files.
 *
 * Usage:
 *   node scripts/generate-secrets.js --railway    # Output for Railway CLI
 *   node scripts/generate-secrets.js --env        # Output for .env file
 *   node scripts/generate-secrets.js --json       # Output as JSON (for programmatic use)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate cryptographically secure random strings
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function generateBase64Secret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

// All required security environment variables
function generateAllSecrets() {
  return {
    // JWT Secrets (64 bytes = 128 hex chars)
    JWT_SECRET: generateSecret(64),
    JWT_REFRESH_SECRET: generateSecret(64),

    // Encryption Keys (32 bytes minimum for AES-256)
    ENCRYPTION_KEY: generateSecret(32),
    FIELD_ENCRYPTION_KEY: generateSecret(32),

    // Security Secrets
    FINGERPRINT_SECRET: generateSecret(32),
    PASSWORD_PEPPER: generateSecret(32),
    SEARCH_HASH_SALT: generateSecret(32),

    // Session Secret
    SESSION_SECRET: generateSecret(32),
  };
}

// Mask a secret for display (show only first/last 4 chars)
function maskSecret(secret) {
  if (secret.length <= 12) return '****';
  return secret.slice(0, 4) + '*'.repeat(secret.length - 8) + secret.slice(-4);
}

// Output format for Railway CLI
function outputForRailway(secrets) {
  console.log('\n# Railway CLI Commands');
  console.log('# Run these commands to set environment variables in Railway:\n');

  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`railway variables set ${key}="${value}"`);
  });

  console.log('\n# Or set all at once:');
  const allVars = Object.entries(secrets)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  console.log(`railway variables set ${allVars}`);
}

// Output format for .env file
function outputForEnv(secrets, outputPath) {
  const envContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  if (outputPath) {
    fs.writeFileSync(outputPath, envContent + '\n');
    console.log(`\nSecrets written to: ${outputPath}`);
    console.log('\nGenerated keys (masked for security):');
    Object.entries(secrets).forEach(([key, value]) => {
      console.log(`  ${key}=${maskSecret(value)}`);
    });
  } else {
    console.log('\n# Add these to your .env file:\n');
    console.log(envContent);
  }
}

// Output as JSON
function outputAsJson(secrets) {
  console.log(JSON.stringify(secrets, null, 2));
}

// Interactive mode - write to file without showing secrets
function outputSecure(secrets, target) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (target === 'railway') {
    const filename = `secrets-railway-${timestamp}.txt`;
    const filepath = path.join(process.cwd(), filename);

    const content = [
      '# Railway Environment Variables',
      '# Generated: ' + new Date().toISOString(),
      '# IMPORTANT: Delete this file after uploading to Railway!',
      '',
      '# Individual commands:',
      ...Object.entries(secrets).map(([key, value]) =>
        `railway variables set ${key}="${value}"`
      ),
      '',
      '# All at once:',
      'railway variables set ' + Object.entries(secrets)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' '),
    ].join('\n');

    fs.writeFileSync(filepath, content);
    fs.chmodSync(filepath, 0o600); // Read/write only for owner

    console.log(`\n✅ Railway commands saved to: ${filename}`);
    console.log('⚠️  IMPORTANT: Delete this file after use!');
    console.log('\nTo use:');
    console.log(`  cat ${filename} | grep "railway variables set" | head -1 | bash`);
    console.log('  # or copy commands manually from the file');

  } else if (target === 'local') {
    const envPath = path.join(process.cwd(), 'backend', '.env.secrets');

    const content = [
      '# Security Environment Variables',
      '# Generated: ' + new Date().toISOString(),
      '# Add these to your .env file or source this file',
      '',
      ...Object.entries(secrets).map(([key, value]) => `${key}=${value}`),
    ].join('\n');

    fs.writeFileSync(envPath, content + '\n');
    fs.chmodSync(envPath, 0o600); // Read/write only for owner

    console.log(`\n✅ Secrets saved to: backend/.env.secrets`);
    console.log('\nTo use, add to your backend/.env:');
    console.log('  # Copy contents from .env.secrets to .env');
    console.log('  # Or source it: source backend/.env.secrets');

  } else if (target === 'both') {
    // Create both files
    outputSecure(secrets, 'railway');
    outputSecure(secrets, 'local');
  }

  console.log('\n📋 Generated keys (masked):');
  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`  ${key}: ${maskSecret(value)}`);
  });
}

// Main
function main() {
  const args = process.argv.slice(2);
  const secrets = generateAllSecrets();

  console.log('🔐 BalkanEstate Security Key Generator\n');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: node scripts/generate-secrets.js [options]

Options:
  --railway     Generate Railway CLI commands (saved to file)
  --local       Generate local .env.secrets file
  --both        Generate both Railway and local files
  --env         Print .env format to stdout
  --json        Print JSON format to stdout
  --show        Show actual values (DANGEROUS - only for debugging)
  --help, -h    Show this help message

Examples:
  node scripts/generate-secrets.js --both     # Recommended: creates files for both
  node scripts/generate-secrets.js --railway  # Railway deployment only
  node scripts/generate-secrets.js --local    # Local development only
`);
    return;
  }

  if (args.includes('--railway')) {
    outputSecure(secrets, 'railway');
  } else if (args.includes('--local')) {
    outputSecure(secrets, 'local');
  } else if (args.includes('--both')) {
    outputSecure(secrets, 'both');
  } else if (args.includes('--env')) {
    outputForEnv(secrets);
  } else if (args.includes('--json')) {
    outputAsJson(secrets);
  } else if (args.includes('--show')) {
    console.log('⚠️  WARNING: Displaying actual secret values!\n');
    outputForEnv(secrets);
  } else {
    // Default: secure mode, create both files
    console.log('No option specified. Creating secure files for both Railway and local.\n');
    outputSecure(secrets, 'both');
  }

  console.log('\n✨ Done! Remember to:');
  console.log('  1. Never commit secret files to git');
  console.log('  2. Delete generated files after uploading to Railway');
  console.log('  3. Keep your .env file secure and never share it');
}

main();
