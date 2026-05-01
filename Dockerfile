# Multi-stage Dockerfile for forScore Archive Viewer

# Stage 1: builder
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: runner
FROM node:22-alpine AS runner
WORKDIR /app

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

# Ensure data directory exists (will be overridden by volume mount at runtime)
RUN mkdir -p /data/libraries

# Run the compiled server
CMD ["node", "dist/server/index.js"]
