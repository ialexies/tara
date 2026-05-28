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
RUN pnpm --filter @tara/auth build
# Remove incremental cache files so tsc always emits fresh output
RUN find . -name "*.tsbuildinfo" -delete
RUN pnpm --filter @tara/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
