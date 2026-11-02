FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY apps/realtime/package.json apps/realtime/
RUN pnpm install --frozen-lockfile --filter @dagitim/realtime
COPY apps/realtime apps/realtime
RUN pnpm --filter @dagitim/realtime build
EXPOSE 3001
CMD ["node", "apps/realtime/dist/index.js"]
