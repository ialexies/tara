FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --frozen-lockfile --filter @tara/api...
RUN pnpm --filter @tara/schemas build
RUN pnpm --filter @tara/db build
RUN pnpm --filter @tara/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
USER nestjs
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
