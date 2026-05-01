FROM oven/bun:alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init \
 && mkdir -p /data/libraries \
 && chown -R bun:bun /data

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

USER bun

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "dist/server/index.js"]
