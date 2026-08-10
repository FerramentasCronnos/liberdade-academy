# Deploy Liberdade Academy no Portainer

Stack completa para deixar o app 100% funcional:

| Serviço | Função |
|---------|--------|
| **api** | Backend Fastify (auth, onboarding, catálogo, comunidade, ranking, vendas, notificações) |
| **postgres** | Banco principal |
| **redis** | Cache de ranking/catálogo |
| **caddy** | Reverse proxy HTTP |
| **adminer** | UI do banco (opcional) |

## 1. Subir no Portainer

1. Abra o Portainer → **Stacks** → **Add stack**
2. Nome: `liberdade-academy`
3. **Repository** (recomendado): clone o Git do repo e use compose path `docker-compose.yml` (raiz)  
   Alternativa local: `docker compose -f docker-compose.yml --env-file infra/.env up -d --build`
4. Em **Environment variables**, use o modelo de `infra/.env.example`  
   (mínimo pra subir já funcional):

```env
POSTGRES_PASSWORD=liberdade_segura_123
JWT_SECRET=chave-longa-aleatoria-aqui
API_PORT=8080
ADMINER_PORT=8088
CATALOG_PROVIDER=seed
```

Catálogo TikTok real (Scavio/Apify/Kalodata) é **opcional** — ver [`INTEGRATIONS.md`](INTEGRATIONS.md).

5. Deploy the stack

> Use o compose da **raiz** (`docker-compose.yml`) no Portainer Git — o build context aponta para `./backend`.

### Alternativa: CLI no servidor

```bash
cd /opt/liberdade-academy
cp infra/.env.example infra/.env
# edite infra/.env
docker compose --env-file infra/.env up -d --build
```

## 2. Validar

```bash
curl http://SEU_IP:8080/health
```

Login seed:

- e-mail: `thais@liberdade.academy`
- senha: `123456`

Adminer: `http://SEU_IP:8088`  
- Sistema: PostgreSQL  
- Server: `postgres`  
- User/Pass/DB: conforme `.env`

## 3. Conectar o app Expo

No `.env` do app mobile:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP:8080
```

Reinicie o Expo (`npx expo start --clear`).

Com essa variável, o app usa a API real (auth JWT, posts, ranking, selling, notificações, catálogo no Postgres). Sem ela, continua no modo demo local.

## 4. Catálogo TikTok (opcional)

Sem provider o seed já enche o catálogo. Detalhes e comparação de preços: [`INTEGRATIONS.md`](INTEGRATIONS.md).

Quando tiverem chave (Scavio/Apify/Kalodata Enterprise):

```bash
curl -X POST http://SEU_IP:8080/products/sync-kalodata \
  -H "Authorization: Bearer SEU_JWT"
```

## 5. Endpoints principais

- `POST /auth/register` · `POST /auth/login` · `GET /auth/me`
- `PUT /users/me/onboarding`
- `GET /products` · `GET /products/:id`
- `GET /posts` · `POST /posts` · `POST /posts/:id/like`
- `GET /ranking`
- `GET /me/selling` · `POST/DELETE /me/selling/:productId`
- `GET /notifications` · `POST /notifications/read`

## 6. Produção (checklist)

- [ ] Trocar `JWT_SECRET` e `POSTGRES_PASSWORD`
- [ ] Colocar Caddy/Traefik com HTTPS (domínio)
- [ ] Backup volume `pg_data`
- [ ] Restringir Adminer (VPN / não expor)
- [ ] (Opcional) `CATALOG_PROVIDER` + chave Scavio/Apify/Kalodata
