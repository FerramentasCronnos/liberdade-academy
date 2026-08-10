# Liberdade Academy

App mobile (iOS + Android) da comunidade exclusiva Liberdade Academy — catálogo de produtos virais, ranking e networking.

## Stack

- Expo SDK 57 + Expo Router
- React Native (iOS e Android)
- TypeScript
- Soft UI (navy / azul / cards arredondados)

## Funcionalidades

- **Login exclusivo** — e-mail + senha (sessão persistida)
- **Catálogo** — 3.000+ produtos virais (demo local; pronto para Kalodata/TikTok)
- **Nichos** — beleza, saúde, físicos e digitais
- **Envio direto** — fornecedor conectado, sem estoque
- **Comunidade** — feed com filtros (dicas, resultados, dúvidas, motivação)
- **Ranking** — pódio + classificação por XP/vendas
- **Perfil** — stats, nichos e top da comunidade

## Como rodar (app)

```bash
cd liberdade-academy
npm install --legacy-peer-deps
npx expo start
```

### Backend (Portainer / Docker)

Stack: API Fastify + Postgres + Redis + Caddy + Adminer.

Guias: [`docs/PORTAINER.md`](docs/PORTAINER.md) · [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) (banco, TikTok, envs)

```bash
cp infra/.env.example infra/.env
# edite senhas/JWT em infra/.env
docker compose --env-file infra/.env up -d --build
curl http://localhost:8080/health
```

No app (`.env`):

```env
EXPO_PUBLIC_API_URL=http://SEU_IP:8080
```

Reinicie o Expo com `npx expo start --clear`.

### Login demo

- **Com API:** `thais@liberdade.academy` / `123456`
- **Sem API (local):** qualquer e-mail válido + senha com 4+ caracteres

## Kalodata (TikTok)

Preferível no backend (`CALODATA_API_KEY` na stack Portainer). Sync via `POST /products/sync-kalodata`.

## Estrutura

```
app/                 # telas Expo Router
backend/             # API Fastify + Prisma
docker-compose.yml   # stack Portainer (raiz)
infra/               # Caddyfile + .env.example
docs/PORTAINER.md    # deploy passo a passo
src/
  contexts/          # Auth + dados (API ou demo)
  services/          # apiClient, Kalodata, mocks
```