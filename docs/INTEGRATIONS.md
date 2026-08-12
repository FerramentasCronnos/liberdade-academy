# Mapa de integrações — Liberdade Academy

O que o app precisa pra ficar **100% funcional** vs o que é **upgrade de catálogo TikTok**.

## Resumo (o que pagar / o que não pagar)

| Camada | Serviço | Obrigatório? | Custo típico | Onde roda |
|--------|---------|--------------|--------------|-----------|
| App mobile | Expo | sim | grátis (dev) | celular / Expo Go |
| API | Fastify (`backend/`) | sim | incluso no VPS | Portainer |
| Banco (auth, comunidade, ranking, vendas, notifs) | **PostgreSQL** | sim | incluso no VPS | container `postgres` |
| Cache | **Redis** | recomendado | incluso no VPS | container `redis` |
| Proxy | Caddy | sim (stack) | incluso | container `caddy` |
| Catálogo viral TikTok | Apify / Kalodata (ver §2) | **não** | pago | API externa → sync no Postgres |
| TikTok Shop oficial (Partner API) | TikTok | só se forem loja própria | conta seller | não serve pra “vitrine viral” aberta |

**Regra prática:** com Portainer + Postgres + seed, o app já funciona (login, onboarding, posts, likes, ranking, selling, notificações, catálogo demo).  
A API de TikTok só entra quando quiserem **atualizar o catálogo com produtos reais/virais**.

---

## 1. Banco e acesso (comunidade, ranking, auth)

### Recomendação: Postgres no próprio Portainer (mais barato e melhor pro nosso caso)

Já está no `docker-compose.yml`. Vocês **não precisam** de Supabase/Firebase/Neon pra começar.

- **Auth:** JWT na nossa API (`JWT_SECRET`) + tabela `User` no Postgres  
- **Comunidade:** tabelas `Post`, `PostLike`, `Comment`  
- **Ranking:** campos `xp`, `level`, `rank`, `salesMade` no `User`  
- **Vendas / catálogo:** `Product`, `SellingProduct`  
- **Notificações:** `Notification`, `NotificationRead`

**Custo:** só o VPS onde o Portainer já roda (ex.: R$ ~60–100/mês no BR).  
Postgres + Redis no mesmo servidor = **R$ 0 extra**.

### Quando migrar pra banco gerenciado?

Só se quiserem backup/HA sem cuidar de volume Docker:

| Opção | Prós | Contras |
|-------|------|---------|
| Neon / Supabase (Postgres gerenciado) | free tier, backup fácil | URL externa, latência, limite free |
| Firebase Auth | auth pronto | muda arquitetura; comunidade/ranking ainda precisam de DB |

**Não recomendado agora:** trocar tudo por Firebase — a API + Postgres já cobre acesso e comunidade.

Env (stack):

```env
POSTGRES_PASSWORD=...          # senha do banco
DATABASE_URL=postgresql://...  # só se a API rodar fora do compose
REDIS_URL=redis://redis:6379
JWT_SECRET=...                 # sessão / controle de acesso
```

---

## 2. Catálogo TikTok Shop (produtos virais)

A API oficial do **TikTok Shop Partner** só enxerga **a loja de vocês** (pedidos, SKUs próprios).  
Não serve pra montar um catálogo aberto de “produtos virais do TikTok”.

Pra vitrine / pesquisa de produtos do marketplace, usam **terceiros**:

| Provider | Custo | Cobre Brasil? | Adapter no código? |
|----------|-------|---------------|--------------------|
| **Apify** — actor `unseenuser/TikTok-Shop-Scraper` | US$ 4,50 / 1.000 produtos | ✅ **sim, testado com dados reais** | ✅ sim |
| **Kalodata** | dashboard US$ 45–100/mês | ✅ 19+ países, inclui BR | ✅ sim, mas API **só Enterprise** |
| **EchoTik** | 100 chamadas grátis, ~US$ 10–29/mês | ⚠️ não confirmado | ❌ falta escrever |
| **Scavio** | 250 créditos/mês grátis, US$ 30/mês = 7k | ⚠️ não confirmado | ❌ falta escrever |
| **FastMoss** | ~US$ 30/mês | ❌ BR não listado nos 17+ países | ❌ falta escrever |

> **Brasil resolvido.** Testamos o actor `unseenuser/TikTok-Shop-Scraper` com
> `region: BR` e voltaram produtos reais (títulos em português, preço em R$,
> lojas brasileiras, contagem de vendas). Custo do teste: US$ 0,02.
>
> Dois actors populares NÃO servem pro BR, apesar da descrição sugerir:
> `pro100chok/tiktok-shop-scraper` aceita só `region: "us"`, e
> `herus13/tiktok-shop-scraper` só faz busca por palavra-chave nos EUA — fora
> deles exige URL de produto pronta e proxy residencial na região.
>
> **Pegadinha do preço:** o `unseenuser` devolve valor em centavos e o próprio
> `priceDisplay` formata errado (mostra `R$3149.00` pra um produto de R$ 31,49).
> Por isso existe `APIFY_PRICE_DIVISOR=100`.

> **Termos de uso:** raspar o TikTok fere o ToS deles. Os actors do Apify fazem
> isso mesmo assim; o risco prático é a fonte quebrar sem aviso. Por isso o
> catálogo é servido do Postgres e o provider só alimenta a tabela — se a fonte
> cair, o app continua de pé com o último sync.

### Recomendação Liberdade Academy

1. **Fase 1 (subir agora):** `CATALOG_PROVIDER=seed` → catálogo do Postgres (app 100% usável).
2. **Fase 2 (catálogo real):** testar as cotas grátis, escolher o provider e preencher a chave.
3. **Kalodata:** só se já tiverem Enterprise; senão não bloqueia o lançamento.

Env (stack / backend):

```env
CATALOG_PROVIDER=seed          # providers com adapter: seed | apify | kalodata
CATALOG_REGIONS=BR             # BR, US ou "BR,US"
CATALOG_SYNC_LIMIT=100         # máx. de produtos por região em cada sync

APIFY_TOKEN=
APIFY_ACTOR_ID=                # aceita "usuario/actor" ou "usuario~actor"
APIFY_ACTOR_ID_BR=             # opcional: actor específico por região
APIFY_ACTOR_ID_US=
APIFY_INPUT_JSON=              # opcional: input próprio do actor

CALODATA_API_KEY=              # só Enterprise
CALODATA_BASE_URL=https://api.kalodata.com/v1
```

Diagnóstico e sync (autenticado):

```bash
GET  /catalog/status           # provider ativo, o que falta configurar, contagem por região
POST /products/sync            # {"provider":"apify","regions":["BR","US"],"limit":200}
POST /products/sync-kalodata   # depreciado — alias de /products/sync com kalodata
```

### Como plugar um provider novo

1. Crie `backend/src/services/catalog/providers/<nome>.ts` implementando `CatalogProvider`
   (`isConfigured`, `missingConfigMessage`, `fetchTopProducts`).
2. Registre em `backend/src/services/catalog/index.ts`.
3. Use `CATALOG_PROVIDER=<nome>`.

O provider só traduz a resposta da API para `RawCatalogProduct`. Categoria,
moeda, limiar de viral e clamps de rating/comissão ficam em `normalize.ts`,
iguais pra todo mundo.

---

## 3. App Expo (só aponta pro backend)

O mobile **não** deve guardar chaves de provider nenhum. Só a URL da API:

```env
EXPO_PUBLIC_API_URL=https://api.seudominio.com
# ou http://IP_DO_VPS:8080
```

---

## 4. Checklist pra “app funcionando” no ar

### Obrigatório

- [ ] VPS com Portainer  
- [ ] Stack `docker-compose.yml` up (postgres, redis, api, caddy)  
- [ ] `POSTGRES_PASSWORD` + `JWT_SECRET` fortes  
- [ ] `curl http://IP:8080/health` → ok  
- [ ] App com `EXPO_PUBLIC_API_URL` apontando pro Caddy  
- [ ] Login seed: `thais@liberdade.academy` / `123456`

### Opcional (depois)

- [ ] Testar cotas grátis (EchoTik / Scavio / Apify) e confirmar cobertura BR  
- [ ] Preencher `CATALOG_PROVIDER` + chave  
- [ ] Rodar sync de produtos  
- [ ] HTTPS com domínio no Caddy  
- [ ] Desligar Adminer na internet pública  

---

## 5. Arquitetura mental

```
App Expo ──► API Fastify (Portainer)
                 │
                 ├── Postgres  → users, posts, ranking, products, selling, notifs
                 ├── Redis     → cache ranking/catálogo
                 └── (opcional) Apify/Kalodata → enriquece tabela products
```

Sem a seta opcional, o app já roda com o seed.
