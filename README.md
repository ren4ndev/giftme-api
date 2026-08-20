# Giftme API

## Pré-requisitos

- Docker + Docker Compose
- Node.js `>=20` e npm `11.6.2` (só necessário se for rodar comandos fora do container — ver [nota sobre a versão do npm](#nota-versão-do-npm))

## Subindo o projeto (Docker)

1. Copie o `.env` de exemplo:

   ```bash
   cp .env.example .env
   ```

2. Suba a API + Postgres:

   ```bash
   docker compose up -d --build
   ```

   Isso builda a imagem no stage `dev` (hot-reload via `tsx watch`) e sobe dois serviços: `api` (porta `3000`) e `postgres` (porta `5432` no host — configurável via `POSTGRES_PORT` no `.env` se já houver outro Postgres local ocupando essa porta).

3. Aplique as migrations do banco:

   ```bash
   npm run db:migrate
   ```

   Roda contra `localhost:5432` (valor de `DATABASE_URL` no `.env`, usado quando fora do compose). Dentro da rede do compose, o serviço `api` usa `postgres` como host automaticamente — ver `docker-compose.yml`.

4. Confirme que subiu:

   ```bash
   curl http://localhost:3000/health   # -> 200 {"status":"ok"} (liveness)
   curl http://localhost:3000/ready    # -> 200 {"status":"ok"} (readiness, checa o Postgres)
   ```

## Fluxo do dia a dia

- **Hot-reload**: com a stack de pé, qualquer edição em `src/` reinicia a API automaticamente dentro do container (bind mount + `tsx watch`) — não precisa rebuildar a imagem.
- **Logs**:

  ```bash
  docker compose logs -f api
  ```

- **Mudou o schema do banco** (`src/db/schema.ts`): gerar e aplicar uma nova migration.

  ```bash
  npm run db:generate   # gera o SQL em drizzle/
  npm run db:migrate    # aplica contra o Postgres do compose
  ```

- **Mudou dependências** (`package.json`): a imagem precisa ser rebuildada, já que o `node_modules` é instalado durante o build (não vem do bind mount).

  ```bash
  docker compose up -d --build
  ```

- **Derrubar a stack**:

  ```bash
  docker compose down      # mantém os dados do Postgres (volume nomeado)
  docker compose down -v   # apaga também o volume — reseta o banco do zero
  ```

## Comandos úteis fora do container

Rodando com Node/npm instalados localmente (útil para lint/typecheck rápidos, sem subir o Docker):

| Comando                         | Descrição                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`                   | roda a API localmente em modo watch (contra o Postgres do compose, se estiver de pé) |
| `npm run build`                 | compila TypeScript para `dist/`                                                      |
| `npm start`                     | roda o build compilado (`node dist/index.js`)                                        |
| `npm run lint` / `lint:fix`     | ESLint                                                                               |
| `npm run format` / `format:fix` | Prettier                                                                             |
| `npm run typecheck`             | checagem de tipos sem gerar build                                                    |
| `npm test`                      | Vitest                                                                               |
| `npm run db:generate`           | gera migration a partir de `src/db/schema.ts`                                        |
| `npm run db:migrate`            | aplica migrations pendentes                                                          |

## Build de produção

A imagem final (stage `prod`) só contém o `dist/` compilado + dependências de runtime, sem TypeScript nem código-fonte:

```bash
docker build --target prod -t giftme-api .
```

> Se esse build falhar com um erro de cache do tipo `failed to compute cache key ... not found`, é cache do BuildKit corrompido/obsoleto, não um problema no Dockerfile — rode com `--no-cache` uma vez (`docker build --no-cache --target prod -t giftme-api .`) ou `docker builder prune`.

## Nota: versão do npm

O projeto trava `npm` na versão `11.6.2` (`engines.npm` no `package.json` + `.npmrc` com `engine-strict=true`, e o `Dockerfile` reinstala essa versão explicitamente). Rodar `npm install`/`npm ci` com outra versão falha de propósito com `EBADENGINE` — isso evita um bug onde versões diferentes de `npm` no host vs. na imagem geravam/validavam o `package-lock.json` de formas diferentes e quebravam o build Docker..
