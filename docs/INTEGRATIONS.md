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
| Catálogo viral TikTok | Scavio / Apify / Kalodata | **não** | pago | API externa → sync no Postgres |
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

| Provider | Tipo | Bom pra | Custo (ordem de grandeza) | API self-serve? |
|----------|------|---------|---------------------------|-----------------|
| **Scavio** | API TikTok Shop | sync no backend (recomendado pra começar pago) | ~US$ 30/mês ou pay-per-call | sim |
| **Apify** (actors TikTok Shop) | scrapers via API | flexível, vários actors | créditos (~US$ 5+) | sim |
| **SocialCrawl / similares** | API produtos/reviews | schema limpo | pay-per-use | sim |
| **Kalodata** | dashboard analytics | pesquisa manual no browser | ~US$ 45–100/mês dashboard | API só **Enterprise** (caro) |

### Recomendação Liberdade Academy

1. **Fase 1 (subir agora):** sem provider → catálogo do **seed** no Postgres (app 100% usável).  
2. **Fase 2 (catálogo real):** `CATALOG_PROVIDER=scavio` (ou `apify`) + chave no Portainer.  
3. **Kalodata:** só se já tiverem plano Enterprise com Open API; senão não bloquear o lançamento.

Env (stack / backend):

```env
CATALOG_PROVIDER=seed          # seed | scavio | apify | kalodata
SCAVIO_API_KEY=
SCAVIO_BASE_URL=https://api.scavio.dev
APIFY_TOKEN=
APIFY_TIKTOK_ACTOR_ID=
CALODATA_API_KEY=              # só Enterprise
CALODATA_BASE_URL=https://api.kalodata.com/v1
```

Sync manual (autenticado):

```bash
POST /products/sync-kalodata   # hoje; evolui pra /products/sync conforme provider
```

---

## 3. App Expo (só aponta pro backend)

O mobile **não** deve guardar chaves de Kalodata/Scavio. Só a URL da API:

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

- [ ] Conta Scavio ou Apify  
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
                 └── (opcional) Scavio/Apify/Kalodata → enriquece tabela products
```

Sem a seta opcional, o app já roda com o seed.
