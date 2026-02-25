# Build stage
FROM node:lts-alpine AS builder

WORKDIR /app

# Install dependencies (faster with lockfile)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

# Build for production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage (minimal image)
FROM node:lts-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (server + minimal deps)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
