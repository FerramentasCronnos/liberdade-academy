import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { MOCK_RANKING } from '../../src/services/mockData';
import { useAuth } from '../../src/contexts/AuthContext';

const { width } = Dimensions.get('window');

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function formatXP(xp: number) {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1).replace('.0', '')}k`;
  return xp.toString();
}

function xpForNextLevel(level: number) {
  return level * 500;
}

export default function RankingScreen() {
  const { user } = useAuth();
  const top3 = MOCK_RANKING.slice(0, 3);
  const rest = MOCK_RANKING.slice(3);

  const renderPodium = () => {
    const second = top3[1];
    const first = top3[0];
    const third = top3[2];

    return (
      <View style={styles.podiumContainer}>
        <PodiumItem user={second} position={2} />
        <PodiumItem user={first} position={1} />
        <PodiumItem user={third} position={3} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerContent}>
            <Ionicons name="trophy" size={28} color={COLORS.gold} />
            <Text style={styles.headerTitle}>Ranking</Text>
            <Ionicons name="trophy" size={28} color={COLORS.gold} />
          </View>
          <Text style={styles.headerSubtitle}>Os melhores vendedores da comunidade</Text>
          {renderPodium()}
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={rest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isCurrentUser = user?.id === item.id;
          const progress = item.xp / xpForNextLevel(item.level);

          return (
            <View style={[styles.rankCard, isCurrentUser && styles.rankCardHighlight]}>
              {isCurrentUser && <View style={styles.currentUserBadge}><Text style={styles.currentUserBadgeText}>Você</Text></View>}
              <View style={styles.rankPosition}>
                <Text style={styles.rankPositionText}>#{item.rank}</Text>
              </View>

              <View style={[styles.avatarSmall, { backgroundColor: COLORS.accent }]}>
                <Text style={styles.avatarSmallText}>{getInitials(item.name)}</Text>
              </View>

              <View style={styles.rankInfo}>
                <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.rankMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={12} color={COLORS.gold} />
                    <Text style={styles.metaText}>Nível {item.level}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="cart" size={12} color={COLORS.accent} />
                    <Text style={styles.metaText}>{item.salesCount} vendas</Text>
                  </View>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                </View>
              </View>

              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>{formatXP(item.xp)} XP</Text>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={
          <Text style={styles.listSectionTitle}>Classificação Geral</Text>
        }
      />
    </View>
  );
}

function PodiumItem({ user, position }: { user: (typeof MOCK_RANKING)[0]; position: number }) {
  const isFirst = position === 1;
  const avatarSize = isFirst ? 80 : 64;
  const bgColor = position === 1 ? COLORS.gold : position === 2 ? COLORS.silver : COLORS.bronze;
  const containerHeight = isFirst ? 160 : 130;
  const medalIcon =
    position === 1 ? 'trophy' : position === 2 ? 'medal' : 'ribbon';

  return (
    <View style={[styles.podiumItem, { height: containerHeight }]}>
      <Ionicons name={medalIcon as any} size={isFirst ? 26 : 22} color={bgColor} style={styles.podiumEmoji} />
      <View
        style={[
          styles.podiumAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderColor: bgColor,
          },
        ]}
      >
        <Text style={[styles.podiumAvatarText, { fontSize: isFirst ? 24 : 18 }]}>
          {getInitials(user.name)}
        </Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{user.name.split(' ')[0]}</Text>
      <View style={[styles.podiumXpBadge, { backgroundColor: bgColor }]}>
        <Text style={styles.podiumXpText}>{formatXP(user.xp)} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingBottom: SPACING.xl,
  },
  headerSafeArea: {
    paddingHorizontal: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.md,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podiumEmoji: {
    marginBottom: SPACING.xs,
  },
  podiumAvatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  podiumAvatarText: {
    color: COLORS.textLight,
    fontWeight: '700',
  },
  podiumName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    maxWidth: width / 3 - SPACING.xl,
    textAlign: 'center',
  },
  podiumXpBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  podiumXpText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.text,
  },
  podiumBadge: {
    fontSize: 14,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 120,
  },
  listSectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  rankCardHighlight: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: '#F0F5FF',
  },
  currentUserBadge: {
    position: 'absolute',
    top: -8,
    right: SPACING.md,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  currentUserBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  rankPosition: {
    width: 36,
    alignItems: 'center',
  },
  rankPositionText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.sm,
  },
  avatarSmallText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  rankInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  rankName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  rankMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  xpBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  xpBadgeText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.accent,
  },
});
