# BalkanEstate Scripts

## Security Key Generator

Generate all required security environment variables for your application.

### Quick Start

```bash
# Generate keys for both Railway and local (recommended)
node scripts/generate-secrets.js --both

# Generate for Railway only
node scripts/generate-secrets.js --railway

# Generate for local only
node scripts/generate-secrets.js --local
```

### All Options

| Option | Description |
|--------|-------------|
| `--both` | Generate files for both Railway and local development |
| `--railway` | Generate Railway CLI commands (saved to file) |
| `--local` | Generate local `.env.secrets` file |
| `--env` | Print `.env` format to stdout |
| `--json` | Print JSON format (for programmatic use) |
| `--help` | Show help message |

### Generated Keys

The script generates these security environment variables:

| Variable | Purpose | Algorithm |
|----------|---------|-----------|
| `JWT_SECRET` | Signs access tokens | HMAC-SHA256 |
| `JWT_REFRESH_SECRET` | Signs refresh tokens | HMAC-SHA256 |
| `ENCRYPTION_KEY` | General encryption | AES-256 |
| `FIELD_ENCRYPTION_KEY` | Database field encryption | AES-256-GCM |
| `FINGERPRINT_SECRET` | Token fingerprinting | HMAC-SHA256 |
| `PASSWORD_PEPPER` | Password hashing | bcrypt |
| `SEARCH_HASH_SALT` | Searchable encryption | HMAC-SHA256 |
| `SESSION_SECRET` | Session management | - |

### Output Files

When using `--railway` or `--local`:

- **Railway**: Creates `secrets-railway-[timestamp].txt` with Railway CLI commands
- **Local**: Creates `backend/.env.secrets` with environment variables

### Security Notes

1. **Never commit secret files** - They are already in `.gitignore`
2. **Delete Railway file after use** - Contains plain text secrets
3. **Restrict file permissions** - Files are created with `chmod 600`
4. **Rotate keys periodically** - Run this script to generate new keys

### Usage Examples

```bash
# First time setup
node scripts/generate-secrets.js --both

# For Railway deployment
cat secrets-railway-*.txt
# Copy the commands and run them in your terminal

# For local development
# Add contents of backend/.env.secrets to backend/.env

# Regenerate all keys (rotation)
node scripts/generate-secrets.js --both
# Update Railway and local .env with new values
```

### Troubleshooting

**"CRITICAL: JWT_SECRET environment variable is not set"**
- Run `node scripts/generate-secrets.js --local`
- Copy secrets from `backend/.env.secrets` to `backend/.env`

**"CRITICAL: FIELD_ENCRYPTION_KEY environment variable is not set"**
- Same as above - ensure all keys are in your `.env` file

**Keys not working after deployment**
- Ensure Railway environment variables are set correctly
- Check with `railway variables` command
