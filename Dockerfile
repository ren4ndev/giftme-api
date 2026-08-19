# syntax=docker/dockerfile:1

# ---- base: imagem Node comum a todos os stages ----
FROM node:24-alpine AS base
WORKDIR /app

RUN npm install -g npm@11.6.2
COPY package.json package-lock.json ./

# ---- deps: todas as dependências (dev incluídas), usadas em dev e para gerar o build ----
FROM base AS deps
RUN npm ci

# ---- prod-deps: só as dependências de produção, para a imagem final ficar enxuta ----
FROM base AS prod-deps
RUN npm ci --omit=dev

# ---- dev: roda o código-fonte direto via tsx watch, com hot-reload (bind mount no compose) ----
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- build: compila TypeScript -> dist/, usando as dev deps (tsc) ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- prod: imagem final, só com dist/ compilado + deps de produção ----
FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
