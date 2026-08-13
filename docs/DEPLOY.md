# Colocar no ar — guia completo

O que falta para o app sair do "roda na sua máquina" e virar produto acessível
aos alunos. Ordem importa: cada bloco depende do anterior.

Estado hoje: o **site já está no ar** em
[liberdade-academy.vercel.app](https://liberdade-academy.vercel.app), mas
**sem API** — login e catálogo falham até o bloco 1 estar pronto.

---

## Arquitetura

```
Navegador
   │
   ├── Site (Next.js)  → Vercel                    ✅ no ar
   │
   └── API (Fastify)   → VPS com Portainer         ❌ falta
          ├── PostgreSQL   (usuários, catálogo, missões, páginas)
          ├── Redis        (cache)
          ├── Caddy        (proxy + HTTPS)
          └── volume       (imagens enviadas)
                 │
                 └── Apify → TikTok Shop (sincroniza o catálogo)
```

---

## 1. Subir a API (bloqueia todo o resto)

### 1.1 Servidor

Um VPS com Docker e Portainer. Qualquer provedor serve — Hetzner, Contabo,
DigitalOcean, Hostinger. Mínimo confortável: **2 vCPU / 4 GB RAM / 40 GB**.

### 1.2 Domínio e HTTPS

Aponte um subdomínio para o IP do VPS, por exemplo `api.seudominio.com`.

O `infra/Caddyfile` hoje serve só HTTP na porta 80. Para HTTPS automático,
troque o conteúdo por:

```caddy
api.seudominio.com {
  encode gzip
  reverse_proxy api:3000
}
```

E no `docker-compose.yml`, o serviço `caddy` precisa expor a 443:

```yaml
ports:
  - "80:80"
  - "443:443"
```

O Caddy emite e renova o certificado sozinho. **HTTPS não é opcional**: o site
no Vercel roda em HTTPS e o navegador bloqueia chamadas para HTTP.

### 1.3 Segredos — gere novos, não reaproveite

Os valores em `infra/.env` são de desenvolvimento. Gere assim:

```bash
# senha do Postgres
openssl rand -base64 24

# JWT_SECRET  (sessão dos alunos)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# CREDENTIALS_KEY  (cifra as credenciais de afiliado no banco)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> Trocar a `CREDENTIALS_KEY` depois torna ilegíveis os segredos já gravados.
> Defina uma vez e guarde.

### 1.4 Variáveis da stack

No Portainer: **Stacks → Add stack → Repository**, apontando para este repo,
com Compose path `docker-compose.yml`. Cole em *Environment variables*:

```env
# --- obrigatório ---
POSTGRES_PASSWORD=<gerado no passo 1.3>
JWT_SECRET=<gerado no passo 1.3>
CREDENTIALS_KEY=<gerado no passo 1.3>
ADMIN_EMAIL=seu@email.com
API_PORT=8080
PUBLIC_URL=https://api.seudominio.com

# --- catálogo ---
CATALOG_PROVIDER=apify
CATALOG_REGIONS=US
CATALOG_SYNC_LIMIT=200
APIFY_TOKEN=<token da Apify>
APIFY_ACTOR_ID=unseenuser/TikTok-Shop-Scraper
APIFY_PRICE_DIVISOR_US=1
APIFY_PRICE_DIVISOR_BR=100

# --- comissão exibida (percentuais SEUS, do Affiliate Center) ---
COMMISSION_RATES_US={"beleza":15,"saude":12,"fitness":12,"moda":10,"casa":10,"tech":6,"digital":20,"fisico":8,"padrao":10}

# --- segurança ---
ADMINER_PORT=8088
```

`PUBLIC_URL` importa: é o prefixo das imagens enviadas (foto de perfil, post,
anúncio do baú). Errado, as imagens quebram.

### 1.5 Tirar o Adminer da internet

O `adminer` na 8088 é um console de banco aberto. Antes de divulgar o app,
remova o serviço do compose ou restrinja por firewall/VPN.

### 1.6 Restringir o CORS

`backend/src/index.ts` está com `origin: true`, que aceita qualquer site.
Troque por:

```ts
await app.register(cors, {
  origin: ['https://liberdade-academy.vercel.app', 'https://seudominio.com'],
  credentials: true,
});
```

### 1.7 Conferir

```bash
curl https://api.seudominio.com/health
```

Migrations e seed rodam sozinhos na subida do container.

---

## 2. Ligar o site na API

```bash
cd web
npx vercel env rm NEXT_PUBLIC_API_URL production --yes
printf 'https://api.seudominio.com' | npx vercel env add NEXT_PUBLIC_API_URL production
npx vercel deploy --prod --yes
```

O redeploy é **obrigatório**: variáveis `NEXT_PUBLIC_*` entram no bundle
durante o build, não são lidas em tempo de execução.

---

## 3. Popular o catálogo

### 3.1 O limite que mais atrapalha

Na conta **gratuita** da Apify, o actor devolve **5 produtos por execução** —
trava do desenvolvedor, não do crédito. Por isso o catálogo local de 130
produtos exigiu 26 execuções, uma por termo de busca.

No **plano pago (Starter, US$ 29/mês)** esse teto cai, e uma execução traz
centenas de produtos. Para chegar aos milhares prometidos, o plano pago é
obrigatório.

### 3.2 Sincronizar

```bash
TOKEN=$(curl -s -X POST https://api.seudominio.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"suasenha"}' | jq -r .token)

curl -X POST https://api.seudominio.com/products/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"apify","regions":["US"],"limit":200}'
```

Para buscar um nicho específico, passe os termos:

```json
{"provider":"apify","regions":["US"],"limit":50,"category":"beleza",
 "terms":["skincare set","makeup kit","hair serum"]}
```

Diagnóstico a qualquer momento:

```bash
curl https://api.seudominio.com/catalog/status
```

### 3.3 Manter atualizado

Um cron diário no VPS mantém o catálogo vivo:

```cron
0 6 * * * /usr/local/bin/sync-catalogo.sh >> /var/log/catalogo.log 2>&1
```

O script faz login, chama `/products/sync` e sai. Produtos que somem da fonte
continuam no banco — o catálogo nunca fica vazio por falha externa.

---

## 4. Custos mensais

| Item | Valor | Observação |
|---|---|---|
| VPS + Portainer | R$ 60–120 | roda API, banco, Redis e proxy |
| Domínio | ~R$ 40/ano | |
| Vercel | R$ 0 | o plano grátis cobre o site |
| Apify Starter | US$ 29 | necessário para volume; inclui US$ 29 de crédito |
| Produtos | US$ 0,0045 cada | 200/dia = US$ 27/mês, cabe no crédito do plano |

Total realista: **~R$ 250–350/mês**.

---

## 5. O que ainda não existe

Não é bug — nunca foi construído, e depende de coisas que só você tem:

| Tela | O que falta |
|---|---|
| **Analytics** | credenciais da API de relatórios da Shopee |
| **Configurar Credenciais** | as chaves dos três marketplaces |
| **Gerar Link — Shopee e Mercado Livre** | App ID/Secret e Client ID/Secret |
| **Webhook de pagamento** | qual plataforma (Hotmart, Kiwify…) e o formato do Firebase |

A Amazon já funciona: o link de afiliado é a URL do produto com `?tag=`, e a
tag o próprio aluno cadastra na tela.

> **Amazon Associates:** a Product Advertising API só libera depois de 3 vendas
> qualificadas. Isso afeta buscar *dados* de produto — não o link, que já
> funciona.

---

## 6. Antes de abrir para os alunos

- [ ] `curl https://api.seudominio.com/health` responde
- [ ] Login funciona no site publicado
- [ ] Catálogo carrega com produtos
- [ ] Foto de perfil e post sobem e aparecem
- [ ] Adminer fora da internet
- [ ] CORS restrito ao domínio do site
- [ ] `ADMIN_EMAIL` é o seu, e só você é admin
- [ ] Percentuais de comissão conferidos no Affiliate Center
- [ ] Backup do volume `pg_data` agendado
