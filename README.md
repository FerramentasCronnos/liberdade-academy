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

## Como rodar

```bash
cd liberdade-academy
npm install --legacy-peer-deps
npx expo start
```

Depois escaneie o QR no Expo Go (iOS/Android) ou pressione `i` / `a` para simulador.

### Login demo

Qualquer e-mail válido + senha com 4+ caracteres entra na comunidade.

## Kalodata (TikTok)

1. Copie `.env.example` → `.env`
2. Preencha `EXPO_PUBLIC_CALODATA_API_KEY` (acesso enterprise Kalodata)
3. Reinicie o Expo

Sem chave, o app usa o catálogo demo e continua funcional.

## Estrutura

```
app/
  (auth)/          # login e cadastro
  (tabs)/          # home, catálogo, comunidade, ranking, perfil
  product/[id].tsx # detalhe do produto
src/
  components/      # FloatingTabBar Soft UI
  contexts/        # autenticação
  services/        # Kalodata + mock data
  constants/       # tema
```
