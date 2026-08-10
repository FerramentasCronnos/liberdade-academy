import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAppData } from '../../src/contexts/AppDataContext';
import { CATEGORIES, MOCK_RANKING, MOCK_PRODUCTS } from '../../src/services/mockData';
import { api, isApiEnabled } from '../../src/services/apiClient';
import { confirmDialog, showAlert } from '../../src/utils/dialog';
import type { RankingUser } from '../../src/types';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function xpForNextLevel(level: number) {
  return level * 500;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { sellingIds, sellingProducts: apiSellingProducts } = useAppData();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [teamPreview, setTeamPreview] = useState<RankingUser[]>(MOCK_RANKING.slice(0, 5));

  useEffect(() => {
    if (!isApiEnabled()) return;
    api
      .ranking()
      .then((res) => {
        if (res.ranking.length) setTeamPreview(res.ranking.slice(0, 5));
      })
      .catch(() => undefined);
  }, []);

  const sellingProducts = useMemo(() => {
    if (apiSellingProducts.length) return apiSellingProducts;
    return MOCK_PRODUCTS.filter((p) => sellingIds.includes(p.id));
  }, [apiSellingProducts, sellingIds]);

  if (!user) return null;

  const xpNext = xpForNextLevel(user.level);
  const xpProgress = user.xp / xpNext;
  const niches = CATEGORIES.filter((c) =>
    ['beleza', 'saude', 'fisico', 'digital'].includes(c.id),
  );

  const handleSignOut = async () => {
    const ok = await confirmDialog(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      'Sair',
    );
    if (!ok) return;
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Perfil</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>Membro exclusivo · Nível {user.level}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.stats.salesMade}</Text>
              <Text style={styles.statLabel}>Vendas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>#{user.rank}</Text>
              <Text style={styles.statLabel}>Ranking</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Meus nichos</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.seeAll}>Catálogo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.folderRow}
        >
          {niches.map((niche) => (
            <TouchableOpacity
              key={niche.id}
              style={styles.folderCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({ pathname: '/(tabs)/catalog', params: { category: niche.id } })
              }
            >
              <View style={styles.folderIcon}>
                <Ionicons name={niche.icon} size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.folderTitle}>{niche.label}</Text>
              <View style={styles.avatarStack}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.miniAvatar,
                      { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i },
                    ]}
                  >
                    <Text style={styles.miniAvatarText}>
                      {getInitials(teamPreview[i]?.name ?? 'LA')}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Top da comunidade</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/ranking')}>
            <Text style={styles.seeAll}>Ver ranking</Text>
          </TouchableOpacity>
        </View>

        {teamPreview.map((member) => (
          <View key={member.id} style={styles.teamRow}>
            <View style={styles.teamIcon}>
              <Text style={styles.teamIconText}>{getInitials(member.name)}</Text>
            </View>
            <View style={styles.teamBody}>
              <Text style={styles.teamName}>{member.name}</Text>
              <Text style={styles.teamStatus}>
                #{member.rank} · {member.salesCount} vendas
              </Text>
            </View>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>Nv {member.level}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl }]}>Progresso</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="star" size={20} color={COLORS.gold} />
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={styles.cardLabel}>Nível {user.level}</Text>
              <Text style={styles.cardValue}>
                {user.xp} / {xpNext} XP
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={styles.cardLabel}>E-mail</Text>
              <Text style={styles.cardValue}>{user.email}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl }]}>
          Produtos que estou vendendo
        </Text>
        {sellingProducts.length === 0 ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/(tabs)/catalog')}
          >
            <Text style={styles.cardLabel}>Nenhum produto ativo</Text>
            <Text style={styles.cardValue}>Toque para abrir o catálogo</Text>
          </TouchableOpacity>
        ) : (
          sellingProducts.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => router.push(`/product/${p.id}`)}
            >
              <Text style={styles.cardValue}>{p.name}</Text>
              <Text style={styles.cardLabel}>{p.commission}% comissão · Envio direto</Text>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.accent} />
            <Text style={[styles.cardValue, { flex: 1, marginLeft: SPACING.md }]}>
              Notificações
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => {
                setNotificationsEnabled(value);
                showAlert(
                  value ? 'Notificações ligadas' : 'Notificações desligadas',
                  value
                    ? 'Você receberá alertas de ranking e produtos virais.'
                    : 'Os alertas ficam pausados neste aparelho.',
                );
              }}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor={COLORS.surface}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            showAlert(
              'Sobre o App',
              'Liberdade Academy — comunidade exclusiva, catálogo viral e ranking. Versão 1.0.0.',
            )
          }
        >
          <View style={styles.cardRow}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.accent} />
            <Text style={[styles.cardValue, { marginLeft: SPACING.md }]}>Sobre o App</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOut} onPress={handleSignOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  screenTitle: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    ...SHADOWS.large,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
  userName: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
  userRole: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: SPACING.xl,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  seeAll: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
    marginBottom: SPACING.md,
  },
  folderRow: {
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  folderCard: {
    width: 140,
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  folderTitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.accentSoft,
  },
  miniAvatarText: {
    fontSize: 8,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  teamIconText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  teamBody: {
    flex: 1,
  },
  teamName: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  teamStatus: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  levelPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  levelPillText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  cardValue: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  signOut: {
    marginTop: SPACING.xxl,
    height: 54,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  signOutText: {
    color: '#FFF',
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
  },
});
