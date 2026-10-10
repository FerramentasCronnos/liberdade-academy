import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { backfillCreatorVideoThumbnails } from '@/lib/domain/catalog/video-thumbs';
import { backfillCreatorAvatars } from './avatars';
import { dominantCategory } from './category';
import {
  KalodataError,
  kalodataBaseBody,
  kalodataCall,
  kalodataProvider,
  parsePublishDate,
} from '@/lib/domain/catalog/providers/kalodata';
import { CatalogConfigError, type Region } from '@/lib/domain/catalog/types';

/**
 * Bank Offers — ranking dos criadores que mais vendem no TikTok Shop, com o
 * perfil de cada um (contatos, GPM, vídeos e produtos) vindo da Kalodata.
 *
 * Custo: cada chamada gasta 0,1 crédito. O ranking são 1–2 chamadas; o perfil
 * de um criador são 3 (detalhe, vídeos, produtos). Por isso o perfil só é
 * renovado a cada `profileRefreshDays` e a execução respeita um orçamento de
 * tempo — o que não couber fica pra próxima rodada do cron.
 *
 * A API não tem endpoint de lives nem de lojas por criador: esses dados ficam
 * só nos contadores do detalhe (live_number, shop_number).
 */

const RANK_PAGE_SIZE = 50;
const PROFILE_PAGE_SIZE = 20;
const TREND_POINTS = 60;
const DAY_MS = 86_400_000;
/** Pior caso de um perfil (3 chamadas com timeout e retries): não começa um sem essa folga. */
const PROFILE_HEADROOM_MS = 45_000;
/** A função da Vercel morre aos 300 s; as capas nunca passam disso. */
const HARD_LIMIT_MS = 265_000;

export interface SyncCreatorsOptions {
  region?: Region;
  /** Tamanho do ranking (padrão 50). */
  top?: number;
  /** Renova o perfil de quem foi sincronizado há mais dias que isso (padrão 14). */
  profileRefreshDays?: number;
  /** Máximo de perfis por execução (padrão 60). */
  maxProfiles?: number;
  /** Orçamento de tempo da execução em ms (padrão 200 000). */
  budgetMs?: number;
}

export interface SyncCreatorsResult {
  region: Region;
  ranked: number;
  created: number;
  profiles: number;
  thumbs?: { pending: number; done: number; failed: number };
  avatars?: { pending: number; done: number; notFound: number };
  errors: string[];
  message: string;
}

/* ------------------------------------------------------------------ tipos */

interface RankCreator {
  creator_id: string;
  creator_nickname?: string;
  creator_handle?: string;
  revenue?: number;
  revenue_growth_rate?: number | null;
  content_views?: string | number | null;
  creator_followers?: string | number | null;
  sales_volumn?: number;
  video_revenue?: number | null;
  live_revenue?: number | null;
}

interface CreatorDetailApi {
  creator_id: string;
  creator_nickname?: string;
  creator_handle?: string;
  creator_status?: string;
  creator_bio?: string;
  creator_contact_email?: string;
  creator_contact_whatsapp?: string;
  creator_contact_facebook?: string;
  creator_contact_ins?: string;
  revenue?: number;
  sales_volumn?: number;
  unit_price?: number;
  video_revenue?: number;
  live_revenue?: number;
  video_views?: number;
  live_views?: number;
  live_gpm?: number;
  video_gpm?: number;
  new_followers?: number;
  video_number?: number;
  live_number?: number;
  shop_number?: number;
  product_number?: number;
  creator_followers?: string | number | null;
}

interface RankVideoApi {
  video_id: string;
  video_title?: string;
  belonged_creator_handle?: string;
  revenue?: number;
  views?: number;
  ads_roas?: number | null;
  digg_count?: number;
  share_count?: number;
  comment_count?: number;
  creator_debut?: string;
  ad?: number;
  publish_date?: string;
}

interface RankProductApi {
  product_id: string;
  product_name?: string;
  revenue?: number;
  commission_rate?: number | null;
  revenue_growth_rate?: number | null;
  sales_volumn?: number;
  unit_price?: number;
  launch_date?: string;
}

type TrendPoint = { d: string; r: number; v?: number; f?: number };

/* ------------------------------------------------------------- utilidades */

/** "236900" → 236900; a API manda contadores grandes como string. */
function toInt(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return null;
  // coluna Int do Postgres é 32 bits; acima disso guarda o teto em vez de falhar
  return Math.min(2_147_483_647, Math.round(n));
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function stripHandle(handle?: string) {
  return (handle ?? '').trim().replace(/^@+/, '');
}

function text(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function trendOf(value: unknown): TrendPoint[] {
  if (!Array.isArray(value)) return [];
  return (value as Array<Record<string, unknown>>).filter(
    (p) => p && typeof p.d === 'string' && typeof p.r === 'number',
  ) as TrendPoint[];
}

/** Um ponto por dia (o do dia substitui o anterior), só os últimos 60. */
function appendTrend(existing: unknown, point: TrendPoint): TrendPoint[] {
  const points = trendOf(existing).filter((p) => p.d !== point.d);
  points.push(point);
  points.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return points.slice(-TREND_POINTS);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/* --------------------------------------------------------------- chamadas */

async function fetchRank(region: Region, top: number): Promise<RankCreator[]> {
  const rows: RankCreator[] = [];
  const seen = new Set<string>();
  const pages = Math.ceil(top / RANK_PAGE_SIZE);
  for (let page = 1; page <= pages; page += 1) {
    // page_size sempre fixo: a API calcula o offset como page_size * (page - 1),
    // então uma última página menor voltaria a trazer linhas já vistas
    const data = await kalodataCall<RankCreator[]>('creator/rank', {
      ...kalodataBaseBody(region),
      date_range: 'last30Day',
      sort_field: { field: 'revenue', type: 'DESC' },
      page_number: page,
      page_size: RANK_PAGE_SIZE,
    });
    const items = (data ?? []).filter((row) => row.creator_id && !seen.has(row.creator_id));
    for (const row of items) seen.add(row.creator_id);
    rows.push(...items);
    if (!data || data.length < RANK_PAGE_SIZE || rows.length >= top) break; // acabou o ranking
  }
  return rows.slice(0, top);
}

async function fetchDetail(region: Region, creatorId: string) {
  return kalodataCall<CreatorDetailApi>('creator/detail', {
    ...kalodataBaseBody(region),
    creator_id: creatorId,
  });
}

/**
 * A Kalodata responde "not found" quando o criador não tem vídeos/produtos no
 * período; isso é lista vazia, não erro (só o detalhe pode dizer que o criador
 * não existe).
 */
async function emptyIfNotFound<T>(call: Promise<T[] | null>): Promise<T[]> {
  try {
    return (await call) ?? [];
  } catch (error) {
    if (error instanceof KalodataError && error.notFound) return [];
    throw error;
  }
}

async function fetchVideos(region: Region, creatorId: string) {
  const data = await emptyIfNotFound(
    kalodataCall<RankVideoApi[] | null>('video/rank', {
      ...kalodataBaseBody(region),
      date_range: 'last30Day',
      creator_id: creatorId,
      sort_field: { field: 'revenue', type: 'DESC' },
      page_number: 1,
      page_size: PROFILE_PAGE_SIZE,
    }),
  );
  return data.filter((video) => video.video_id);
}

async function fetchProducts(region: Region, creatorId: string) {
  const data = await emptyIfNotFound(
    kalodataCall<RankProductApi[] | null>('product/rank', {
      ...kalodataBaseBody(region),
      date_range: 'last30Day',
      creator_id: creatorId,
      sort_field: { field: 'revenue', type: 'DESC' },
      page_number: 1,
      page_size: PROFILE_PAGE_SIZE,
    }),
  );
  return data.filter((product) => product.product_id);
}

/* ---------------------------------------------------------------- ranking */

async function syncRank(region: Region, top: number, now: Date) {
  const rows = await fetchRank(region, top);
  // vazio é falha da API (cota, queda), não um ranking sem ninguém: seguir
  // adiante desativaria todos os criadores da região
  if (!rows.length) throw new KalodataError(`creator/rank devolvió vacío para ${region}`);
  const today = now.toISOString().slice(0, 10);
  const currency = kalodataBaseBody(region).currency;

  const existing = await prisma.creator.findMany({
    where: { region },
    select: { id: true, externalId: true, trend: true },
  });
  const byExternalId = new Map(existing.map((c) => [c.externalId, c]));

  let created = 0;
  for (const [index, row] of rows.entries()) {
    const revenue = toNumber(row.revenue) ?? 0;
    const followers = toInt(row.creator_followers);
    const videoViews = toNumber(row.content_views);
    const point: TrendPoint = {
      d: today,
      r: revenue,
      ...(videoViews !== null ? { v: videoViews } : {}),
      ...(followers !== null ? { f: followers } : {}),
    };
    const current = byExternalId.get(row.creator_id);
    const trend = appendTrend(current?.trend, point) as unknown as Prisma.InputJsonValue;
    const handle = stripHandle(row.creator_handle);
    const nickname = text(row.creator_nickname) || handle || row.creator_id;

    const data = {
      // sem handle no ranking, fica o que o detalhe já preencheu
      ...(handle ? { handle } : {}),
      nickname,
      currency,
      revenue,
      revenueGrowth: toNumber(row.revenue_growth_rate),
      salesCount: toInt(row.sales_volumn) ?? 0,
      followers,
      videoViews,
      videoRevenue: toNumber(row.video_revenue),
      liveRevenue: toNumber(row.live_revenue),
      rank: index + 1,
      active: true,
      rankSyncedAt: now,
      trend,
    };

    if (current) {
      await prisma.creator.update({ where: { id: current.id }, data });
    } else {
      await prisma.creator.create({
        data: {
          ...data,
          handle: handle || row.creator_id,
          region,
          externalId: row.creator_id,
        },
      });
      created += 1;
    }
  }

  // quem saiu do top perde a posição e some da lista; volta quando reentrar
  await prisma.creator.updateMany({
    where: { region, externalId: { notIn: rows.map((row) => row.creator_id) } },
    data: { rank: null, active: false },
  });

  return { ranked: rows.length, created };
}

/* ----------------------------------------------------------------- perfil */

async function syncProfile(creator: { id: string; externalId: string; region: string; handle: string }, now: Date) {
  const region = creator.region as Region;
  const detail = await fetchDetail(region, creator.externalId);
  const videos = await fetchVideos(region, creator.externalId);
  const products = await fetchProducts(region, creator.externalId);
  const handle = stripHandle(detail.creator_handle) || creator.handle;

  // produto que já está no catálogo (mesmo id na Kalodata) ganha o link
  const linked = products.length
    ? await prisma.product.findMany({
        where: {
          provider: 'kalodata',
          region,
          externalId: { in: products.map((p) => p.product_id) },
        },
        select: { id: true, externalId: true },
      })
    : [];
  const productIdOf = new Map(linked.map((p) => [p.externalId, p.id]));

  // engajamento e estreia saem dos vídeos buscados
  let views = 0;
  let interactions = 0;
  let debut: Date | undefined;
  const videoRows: Prisma.CreatorVideoCreateManyInput[] = [];
  const seenVideos = new Set<string>();
  for (const video of videos) {
    if (seenVideos.has(video.video_id)) continue;
    seenVideos.add(video.video_id);
    const v = toInt(video.views) ?? 0;
    const likes = toInt(video.digg_count) ?? 0;
    const comments = toInt(video.comment_count) ?? 0;
    const shares = toInt(video.share_count) ?? 0;
    views += v;
    interactions += likes + comments + shares;
    const debutAt = parsePublishDate(video.creator_debut);
    if (debutAt && (!debut || debutAt < debut)) debut = debutAt;
    const videoHandle = stripHandle(video.belonged_creator_handle) || handle;
    videoRows.push({
      creatorId: creator.id,
      videoId: video.video_id,
      title: video.video_title?.trim() ?? '',
      url: `https://www.tiktok.com/@${videoHandle}/video/${video.video_id}`,
      revenue: toNumber(video.revenue) ?? 0,
      views: v,
      likes,
      comments,
      shares,
      isAd: video.ad === 1,
      adsRoas: toNumber(video.ads_roas),
      publishedAt: parsePublishDate(video.publish_date),
      syncedAt: now,
    });
  }

  const seenProducts = new Set<string>();
  const productRows: Prisma.CreatorProductCreateManyInput[] = [];
  for (const product of products) {
    if (seenProducts.has(product.product_id)) continue;
    seenProducts.add(product.product_id);
    const commission = toNumber(product.commission_rate);
    productRows.push({
      creatorId: creator.id,
      productExternalId: product.product_id,
      productId: productIdOf.get(product.product_id) ?? null,
      name: product.product_name?.trim() || product.product_id,
      revenue: toNumber(product.revenue) ?? 0,
      revenueGrowth: toNumber(product.revenue_growth_rate),
      salesCount: toInt(product.sales_volumn) ?? 0,
      unitPrice: toNumber(product.unit_price),
      commission: commission === null ? null : Math.round(commission),
      launchDate: parsePublishDate(product.launch_date),
      syncedAt: now,
    });
  }

  // capas já obtidas não se perdem na troca das linhas
  const previousThumbs = videoRows.length
    ? await prisma.creatorVideo.findMany({
        where: {
          creatorId: creator.id,
          thumbnail: { not: null },
          videoId: { in: videoRows.map((v) => v.videoId) },
        },
        select: { videoId: true, thumbnail: true },
      })
    : [];
  const thumbOf = new Map(previousThumbs.map((v) => [v.videoId, v.thumbnail]));
  for (const row of videoRows) row.thumbnail = thumbOf.get(row.videoId) ?? null;

  await prisma.$transaction([
    prisma.creatorVideo.deleteMany({ where: { creatorId: creator.id } }),
    ...(videoRows.length ? [prisma.creatorVideo.createMany({ data: videoRows })] : []),
    prisma.creatorProduct.deleteMany({ where: { creatorId: creator.id } }),
    ...(productRows.length ? [prisma.creatorProduct.createMany({ data: productRows })] : []),
    prisma.creator.update({
      where: { id: creator.id },
      data: {
        handle,
        ...(text(detail.creator_nickname) ? { nickname: detail.creator_nickname!.trim() } : {}),
        status: text(detail.creator_status),
        bio: text(detail.creator_bio),
        contactEmail: text(detail.creator_contact_email),
        contactWhatsapp: text(detail.creator_contact_whatsapp),
        contactInstagram: text(detail.creator_contact_ins),
        contactFacebook: text(detail.creator_contact_facebook),
        unitPrice: toNumber(detail.unit_price),
        videoGpm: toNumber(detail.video_gpm),
        liveGpm: toNumber(detail.live_gpm),
        liveViews: toNumber(detail.live_views),
        newFollowers: toInt(detail.new_followers),
        videoCount: toInt(detail.video_number),
        liveCount: toInt(detail.live_number),
        shopCount: toInt(detail.shop_number),
        productCount: toInt(detail.product_number),
        ...(toInt(detail.creator_followers) !== null ? { followers: toInt(detail.creator_followers) } : {}),
        debutDate: debut ?? null,
        engagementRate: views > 0 ? (interactions / views) * 100 : null,
        category: dominantCategory(productRows.map((row) => row.name)),
        profileSyncedAt: now,
      },
    }),
  ]);
}

/* ------------------------------------------------------------------- sync */

export async function syncCreators(options: SyncCreatorsOptions = {}): Promise<SyncCreatorsResult> {
  if (!kalodataProvider.isConfigured()) throw new CatalogConfigError(kalodataProvider.missingConfigMessage());

  const region: Region = options.region ?? 'US';
  const top = Math.max(1, options.top ?? 50);
  const profileRefreshDays = options.profileRefreshDays ?? 14;
  const maxProfiles = Math.max(0, options.maxProfiles ?? 60);
  const budgetMs = options.budgetMs ?? 200_000;
  const started = Date.now();
  const deadline = started + budgetMs;
  const now = new Date();
  const errors: string[] = [];

  const { ranked, created } = await syncRank(region, top, now);

  // perfis: primeiro quem nunca teve, depois os mais antigos, na ordem do ranking
  const stale = new Date(now.getTime() - profileRefreshDays * DAY_MS);
  const candidates = await prisma.creator.findMany({
    where: {
      region,
      active: true,
      OR: [{ profileSyncedAt: null }, { profileSyncedAt: { lt: stale } }],
    },
    orderBy: [{ rank: 'asc' }, { revenue: 'desc' }],
    take: maxProfiles,
    select: { id: true, externalId: true, region: true, handle: true },
  });

  let profiles = 0;
  for (const creator of candidates) {
    if (Date.now() + PROFILE_HEADROOM_MS >= deadline) break;
    try {
      await syncProfile(creator, now);
      profiles += 1;
    } catch (error) {
      if (error instanceof KalodataError && error.notFound) {
        // marca como sincronizado pra não gastar crédito com ele a cada rodada;
        // volta a ser tentado quando o perfil vencer
        await prisma.creator.update({
          where: { id: creator.id },
          data: { profileSyncedAt: now },
        });
        errors.push(`@${creator.handle}: no encontrado en Kalodata (omitido)`);
        continue;
      }
      // um criador com problema não derruba a execução
      errors.push(`@${creator.handle}: ${errorMessage(error)}`);
    }
  }

  // capas dos vídeos novos com o tempo que sobrou
  const thumbsDeadline = Math.min(deadline + 30_000, started + HARD_LIMIT_MS);
  const thumbs = Date.now() < deadline ? await backfillCreatorVideoThumbnails(60, thumbsDeadline) : undefined;
  // fotos de perfil novas (criadores que entraram no ranking)
  const avatars = Date.now() < thumbsDeadline ? await backfillCreatorAvatars(20, thumbsDeadline) : undefined;

  const pending = Math.max(0, candidates.length - profiles);
  const message =
    `${ranked} creadores en el ranking de ${region} (${created} nuevos), ${profiles} perfiles actualizados` +
    (pending ? `, ${pending} pendientes para la próxima ejecución` : '') +
    (errors.length ? `, ${errors.length} con error` : '') +
    '.';

  return { region, ranked, created, profiles, thumbs, avatars, errors, message };
}
