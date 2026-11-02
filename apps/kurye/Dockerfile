FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY apps/kurye/package.json apps/kurye/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @dagitim/kurye...
COPY packages/shared packages/shared
COPY apps/kurye apps/kurye
ARG VITE_API_URL=""
ARG VITE_REALTIME_URL
ENV VITE_API_URL=$VITE_API_URL VITE_REALTIME_URL=$VITE_REALTIME_URL
RUN pnpm --filter @dagitim/kurye build

FROM caddy:2-alpine
COPY --from=build /app/apps/kurye/dist /srv
COPY apps/kurye/Caddyfile.static /etc/caddy/Caddyfile
