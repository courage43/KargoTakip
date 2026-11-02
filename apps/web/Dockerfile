FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/excel/package.json packages/excel/
RUN pnpm install --frozen-lockfile --filter @dagitim/web...

FROM deps AS build
COPY packages packages
COPY apps/web apps/web
RUN pnpm --filter @dagitim/db generate
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_REALTIME_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_KURYE_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL NEXT_PUBLIC_KURYE_URL=$NEXT_PUBLIC_KURYE_URL
RUN pnpm --filter @dagitim/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
# Prisma CLI ve şema: konteyner açılışında migrate deploy için
COPY --from=build /app/packages/db/prisma ./packages/db/prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY apps/web/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data/storage
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
