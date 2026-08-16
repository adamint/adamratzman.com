# syntax=docker/dockerfile:1

ARG TARGET=api-runtime

FROM node:22-slim AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/api/package.json services/api/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

FROM dependencies AS api-build
COPY . .
RUN npm run build:api

FROM dependencies AS web-build
COPY . .
RUN npm run build:web

FROM node:22-slim AS api-prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/api/package.json services/api/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev \
      --workspace @adamratzman/contracts \
      --workspace @adamratzman/api \
      --include-workspace-root=false

FROM node:22-slim AS api-runtime
WORKDIR /app

COPY --from=api-prod-deps /app /app
COPY --from=api-build /app/packages/contracts/dist packages/contracts/dist
COPY --from=api-build /app/services/api/dist services/api/dist

ENV NODE_ENV=production
WORKDIR /app/services/api

FROM nginxinc/nginx-unprivileged:1.29-alpine AS web-runtime

COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html

ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
ENV NGINX_ENVSUBST_FILTER="^(API_HTTP|NGINX_LOCAL_RESOLVERS|PORT)$"
ENV PORT=8080

FROM ${TARGET} AS final
