# =============================================================================
# Backend Dockerfile - Multi-stage build for production
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Fonts for sharp's text renderer (disclaimer captions). The app ships its own
# font file, but fontconfig needs a config to resolve any family at all.
RUN apk add --no-cache fontconfig ttf-dejavu

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy runtime assets that live outside dist (the font used to draw the
# AI-staging disclaimer onto generated images — without it the caption
# renders as empty boxes). Resolved as ../../assets from dist/services.
COPY --from=builder /app/assets ./assets

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start server
CMD ["node", "dist/server.js"]
