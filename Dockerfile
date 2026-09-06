# =============================================================================
# Combined Frontend + Backend Dockerfile
#
# Builds the React frontend (Vite) and Express backend together, then produces
# a single production image where Express serves both the API (/api/*) and the
# static frontend files.  This is required for proper social-media link sharing:
# the Express server can inject property-specific OG meta tags for bots before
# falling back to the generic index.html for regular browsers.
#
# Build context: project root (.)
# =============================================================================

# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install frontend dependencies
COPY package*.json ./
RUN npm ci --omit=optional

# Copy frontend source
COPY . .

# Build frontend (Vite + prerender)
RUN npm run build

# ── Stage 2: Build backend ───────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --omit=optional

# Copy backend source
COPY backend/ .

# Compile TypeScript
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Fonts for sharp's text renderer (disclaimer captions). The app ships its own
# font file, but fontconfig needs a config to resolve any family at all.
RUN apk add --no-cache fontconfig ttf-dejavu

# Install backend production dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy runtime assets that live outside dist (the font used to draw the
# AI-staging disclaimer onto generated images — without it the caption
# renders as empty boxes). Resolved as ../../assets from dist/services.
COPY --from=backend-builder /app/backend/assets ./assets

# Copy built frontend to /app/frontend so Express can serve it
COPY --from=frontend-builder /app/dist /app/frontend

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Express reads this to locate the built frontend assets
ENV FRONTEND_DIST_PATH=/app/frontend

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start the Express server (serves both API and frontend)
CMD ["node", "dist/server.js"]
