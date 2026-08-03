# PRD — Gift Me API

## 1. Visão geral

Gift Me é uma aplicação mobile que permite a um usuário associar seu endereço físico a um **nome de usuário único** (username). Esse username pode ser compartilhado publicamente (redes sociais, listas de presentes, etc.) e usado por terceiros — em especial marketplaces de e-commerce — para **entregar um presente ao usuário sem que o remetente tenha acesso aos detalhes do endereço**.

Este repositório contém a **API backend** dessa aplicação.

> Contexto do projeto: uso pessoal de aprendizado. Não há previsão de uso em produção real no curto prazo, mas o projeto deve ser conduzido com os mesmos padrões de qualidade, segurança e boas práticas de um sistema profissional, servindo como estudo de arquitetura backend moderna em Node.js/TypeScript.

## 2. Problema a resolver

Hoje, para presentear alguém através de um marketplace, é necessário compartilhar o endereço completo com o remetente (amigo, familiar, ou até um desconhecido em uma lista de casamento/aniversário pública). Isso expõe dados sensíveis de localização desnecessariamente.

A Gift Me resolve isso desacoplando **identidade pública (username)** de **dado sensível (endereço)**: o remetente só precisa saber o username; o marketplace consulta o endereço via API no momento do checkout, usando uma credencial própria (API Key), sem nunca expor o dado ao remetente final.

## 3. Personas

- **Usuário final (dono do endereço)**: se cadastra no app mobile, define um username único, cadastra e gerencia um ou mais endereços, e escolhe qual endereço fica "ativo" para presentes.
- **Parceiro/Marketplace (terceiro consumidor da API)**: sistema de e-commerce que, durante um checkout de presente, consulta a API Gift Me com o username informado pelo comprador para obter o endereço de entrega. Autentica-se via API Key própria, emitida previamente.
- **Administrador**: responsável por aprovar/emitir API Keys para parceiros (pode ser um processo manual/script na v1, sem painel administrativo dedicado).

## 4. Requisitos funcionais

### 4.1 Contas de usuário

- RF01: Cadastro de usuário com e-mail, senha e username único.
- RF02: Login com e-mail/senha retornando access token (JWT curto) e refresh token (JWT longo, revogável).
- RF03: Renovação de sessão via refresh token (rotation: cada uso gera novo refresh token e invalida o anterior).
- RF04: Logout, revogando o refresh token ativo.
- RF05: Validação de username: único no sistema, formato restrito (ex.: `a-z0-9_.`, 3–30 caracteres), case-insensitive para unicidade.
- RF06: Usuário pode alterar seu username, respeitando a unicidade.
- RF07: Usuário pode alterar sua senha (exigindo senha atual).

### 4.2 Endereços

- RF08: Usuário autenticado pode cadastrar um ou mais endereços (rua, número, complemento, bairro, cidade, estado, país, CEP, referência).
- RF09: Usuário pode editar e remover seus próprios endereços.
- RF10: Usuário define qual endereço está **ativo** (é o retornado nas consultas por username). Apenas um endereço ativo por vez.
- RF11: Usuário pode listar seus próprios endereços cadastrados.

### 4.3 Consulta por terceiros (marketplaces)

- RF12: Endpoint público (não requer login de usuário final) que recebe um `username` e retorna o endereço ativo associado, **autenticado via API Key** de parceiro no header (ex.: `X-Api-Key`).
- RF13: Retornar erro claro e sem vazar informação quando o username não existir ou não tiver endereço ativo (mesma resposta genérica para evitar enumeração de usuários).
- RF14: Toda consulta de terceiro deve ser registrada em log de auditoria (qual parceiro, qual username, quando) — sem logar o conteúdo do endereço em texto livre nos logs de aplicação.

### 4.4 Gestão de parceiros/API Keys

- RF15: Modelo de dados para parceiros (nome, contato) e suas API Keys (hash da key armazenado, nunca a key em texto puro).
- RF16: Suporte a revogação de API Key.
- RF17: Rate limiting por API Key nas consultas de endereço.
- RF18 (v1, simplificado): criação de parceiro/API Key pode ser feita via script/seed administrativo, sem necessidade de painel visual nesta fase.

## 5. Requisitos não funcionais

- RNF01: **Segurança**
  - Senhas com hash forte (bcrypt/argon2), nunca em texto puro.
  - JWTs assinados com segredo/rotação de chave configurável via variável de ambiente.
  - API Keys de parceiros armazenadas como hash (nunca reversível).
  - Rate limiting global e por credencial (usuário e parceiro).
  - Validação e sanitização de toda entrada (body, query, params) via schemas.
  - Headers de segurança HTTP (Helmet ou equivalente), CORS configurado explicitamente.
  - Nenhum dado sensível (senha, token, endereço completo) deve aparecer em logs.
  - Princípio de menor privilégio: endpoint de consulta por terceiro nunca deve permitir alterar dados, apenas leitura.
- RNF02: **Qualidade de código**
  - TypeScript em modo estrito (`strict: true`).
  - Lint e formatação automatizados, aplicados via hook de pre-commit e CI.
  - Arquitetura em camadas (rotas → controllers → services → repositórios), com separação clara de responsabilidades.
  - Tratamento de erros centralizado (middleware de erro único, erros tipados/customizados, respostas de erro padronizadas).
- RNF03: **Testes automatizados**
  - Testes unitários para regras de negócio (services).
  - Testes de integração para os endpoints HTTP (rotas + banco de dados real ou de teste).
  - Cobertura mínima definida como meta (ex.: 80% em services/controllers críticos).
  - Testes rodando em pipeline de CI antes de merge.
- RNF04: **Observabilidade**
  - Logging estruturado (JSON) com correlação de requisição (request ID).
  - Tracing distribuído e métricas via OpenTelemetry, exportáveis para backends open source (ex.: Jaeger/Prometheus/Grafana) via OTLP.
  - Health checks (`/health`, `/ready`) para verificação de liveness/readiness.
- RNF05: **Documentação**
  - Especificação OpenAPI/Swagger mantida atualizada, com UI navegável em ambiente de desenvolvimento.
  - CLAUDE.md e PRD.md mantidos atualizados conforme o projeto evolui.
- RNF06: **Portabilidade e ambiente**
  - Projeto executável localmente via Docker Compose (API + Postgres), com variáveis de ambiente documentadas (`.env.example`).
  - Migrations de banco versionadas e aplicáveis via comando único.

## 6. Stack tecnológica

Todas as tecnologias escolhidas são open source.

| Categoria              | Escolha                                         |
| ---------------------- | ----------------------------------------------- |
| Linguagem              | TypeScript                                      |
| Runtime                | Node.js                                         |
| Framework HTTP         | Express                                         |
| Gerenciador de pacotes | npm                                             |
| Banco de dados         | PostgreSQL                                      |
| ORM / Query builder    | Drizzle ORM                                     |
| Autenticação usuário   | JWT (access token + refresh token com rotation) |
| Autenticação parceiro  | API Key (hash armazenado, header dedicado)      |
| Validação de schema    | Zod                                             |
| Testes unit/integração | Vitest + Supertest                              |
| Logging                | Pino (logs estruturados em JSON)                |
| Tracing / métricas     | OpenTelemetry (exportação via OTLP)             |
| Lint / formatação      | ESLint + Prettier                               |
| Containerização        | Docker + docker-compose                         |
| Documentação de API    | OpenAPI/Swagger                                 |

## 7. Modelo de dados (alto nível)

- **User**: id, email (único), passwordHash, username (único), createdAt, updatedAt.
- **Address**: id, userId (FK), campos de endereço, isActive (bool), createdAt, updatedAt.
- **RefreshToken**: id, userId (FK), tokenHash, revokedAt, expiresAt, createdAt.
- **Partner**: id, name, contactEmail, createdAt.
- **ApiKey**: id, partnerId (FK), keyHash, revokedAt, createdAt.
- **AuditLog** (consultas de terceiros): id, partnerId, usernameConsultado, timestamp, resultado (encontrado/não encontrado).

## 8. Endpoints (visão inicial, sujeita a refinamento)

```
POST   /auth/register            → cria usuário
POST   /auth/login               → autentica, retorna access + refresh token
POST   /auth/refresh             → rotaciona refresh token
POST   /auth/logout              → revoga refresh token

GET    /me                       → dados do usuário autenticado
PATCH  /me/username              → altera username
PATCH  /me/password              → altera senha

GET    /me/addresses             → lista endereços do usuário
POST   /me/addresses             → cria endereço
PATCH  /me/addresses/:id         → edita endereço
DELETE /me/addresses/:id         → remove endereço
POST   /me/addresses/:id/activate→ define endereço ativo

GET    /partners/lookup/:username → (auth: API Key) retorna endereço ativo do username

GET    /health                   → liveness
GET    /ready                    → readiness
GET    /docs                     → Swagger UI
```

## 9. Fora de escopo (v1)

- Painel administrativo visual para gestão de parceiros.
- Notificações push para o usuário quando seu endereço for consultado.
- Múltiplos destinatários de presente por evento/lista de desejos.
- Internacionalização de endereços além de campos genéricos (ex.: validação específica por país).
- Pagamentos ou qualquer lógica de checkout — isso é responsabilidade do marketplace.

## 10. Critérios de sucesso (objetivo de aprendizado)

- API funcional cobrindo o fluxo completo: cadastro → definição de username → cadastro de endereço → consulta por parceiro.
- Suíte de testes automatizados rodando em CI, com boa cobertura das regras de negócio.
- Logs estruturados e rastreáveis por request ID; tracing básico funcionando ponta a ponta.
- Código organizado em camadas, tipado estritamente, sem segredos ou dados sensíveis vazando em logs/erros.
- Documentação OpenAPI navegável refletindo os endpoints reais.
