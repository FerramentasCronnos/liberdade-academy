import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { MOCK_PRODUCTS, CATEGORIES } from '../../src/services/mockData';

const { width } = Dimensions.get('window');
const GRID_GAP = SPACING.md;
const CARD_WIDTH = (width - SPACING.lg * 2 - GRID_GAP) / 2;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

const ACTIVITY = [
  {
    id: '1',
    icon: 'flame' as const,
    color: COLORS.error,
    title: 'Produto viral do dia',
    subtitle: 'Sérum Vitamina C — 2.3M views',
    time: 'Hoje',
  },
  {
    id: '2',
    icon: 'people' as const,
    color: COLORS.info,
    title: 'Nova postagem na comunidade',
    subtitle: 'Ana Clara compartilhou um resultado',
    time: '2h',
  },
  {
    id: '3',
    icon: 'trophy' as const,
    color: COLORS.gold,
    title: 'Você subiu no ranking',
    subtitle: 'Agora você está em #6',
    time: '6h',
  },
];

const NICHE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  beleza: 'flower',
  saude: 'fitness',
  fisico: 'cube',
  digital: 'cloud-download',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const firstName = user?.name?.split(' ')[0] ?? 'Membro';

  const gridProducts = useMemo(() => {
    const viral = MOCK_PRODUCTS.filter((p) => p.isViral).slice(0, 4);
    return viral;
  }, []);

  const niches = CATEGORIES.filter((c) =>
    ['beleza', 'saude', 'fisico', 'digital'].includes(c.id),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="apps" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Home</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <View>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              <View style={styles.dot} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.hi}>Olá, {firstName}!</Text>
        <Text style={styles.greeting}>{getGreeting()}</Text>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos virais..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() =>
              router.push({ pathname: '/(tabs)/catalog', params: { q: query } })
            }
          />
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeTitle}>Bem-vindo!</Text>
            <Text style={styles.welcomeSubtitle}>
              Explore 3.000+ produtos virais validados e venda sem estoque.
            </Text>
            <TouchableOpacity
              style={styles.welcomeCta}
              onPress={() => router.push('/(tabs)/catalog')}
              activeOpacity={0.85}
            >
              <Text style={styles.welcomeCtaText}>Explorar catálogo</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeArt}>
            <View style={styles.artCircle}>
              <Ionicons name="rocket" size={40} color={COLORS.accent} />
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Em alta agora</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {gridProducts.map((item, index) => {
            const highlighted = index === 0;
            const progress = Math.min(item.salesCount / 20000, 1);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.projectCard, highlighted && styles.projectCardDark]}
                activeOpacity={0.85}
                onPress={() => router.push(`/product/${item.id}`)}
              >
                <View style={styles.projectTop}>
                  <Text style={[styles.projectDate, highlighted && styles.textOnDark]}>
                    Viral · TikTok
                  </Text>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={16}
                    color={highlighted ? 'rgba(255,255,255,0.7)' : COLORS.textMuted}
                  />
                </View>

                <View
                  style={[
                    styles.projectIcon,
                    highlighted ? styles.projectIconOnDark : styles.projectIconLight,
                  ]}
                >
                  <Ionicons
                    name={NICHE_ICONS[item.category] ?? 'cube'}
                    size={22}
                    color={highlighted ? '#FFFFFF' : COLORS.primary}
                  />
                </View>

                <Text
                  style={[styles.projectName, highlighted && styles.textOnDark]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>

                <View style={styles.progressRow}>
                  <View
                    style={[
                      styles.progressTrack,
                      highlighted && styles.progressTrackOnDark,
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: highlighted ? '#5B9CFF' : COLORS.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressLabel, highlighted && styles.textOnDark]}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Nichos</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.nicheRow}
        >
          {niches.map((niche) => (
            <TouchableOpacity
              key={niche.id}
              style={styles.nicheCard}
              activeOpacity={0.8}
              onPress={() =>
                router.push({ pathname: '/(tabs)/catalog', params: { category: niche.id } })
              }
            >
              <View style={styles.nicheIcon}>
                <Ionicons name={niche.icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.nicheLabel}>{niche.label}</Text>
              <Text style={styles.nicheHint}>Envio direto</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Atividade</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/ranking')}>
            <Text style={styles.seeAll}>Ranking</Text>
          </TouchableOpacity>
        </View>

        {ACTIVITY.map((item) => (
          <TouchableOpacity key={item.id} style={styles.activityCard} activeOpacity={0.75}>
            <View style={[styles.activityIcon, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.activityBody}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.activityTime}>{item.time}</Text>
          </TouchableOpacity>
        ))}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  hi: {
    fontSize: FONTS.sizes.title,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  greeting: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    height: 52,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  welcomeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.xxl,
    ...SHADOWS.medium,
  },
  welcomeText: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  welcomeTitle: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  welcomeCta: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
  },
  welcomeCtaText: {
    color: '#FFF',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
  },
  welcomeArt: {
    justifyContent: 'center',
  },
  artCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  seeAll: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: SPACING.xxl,
  },
  projectCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    minHeight: 168,
    ...SHADOWS.medium,
  },
  projectCardDark: {
    backgroundColor: COLORS.primary,
  },
  projectTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  projectDate: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  projectIconLight: {
    backgroundColor: COLORS.accentSoft,
  },
  projectIconOnDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  projectName: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    minHeight: 36,
  },
  textOnDark: {
    color: '#FFFFFF',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 'auto',
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  progressTrackOnDark: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    width: 32,
    textAlign: 'right',
  },
  nicheRow: {
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  nicheCard: {
    width: 120,
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  nicheIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  nicheLabel: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  nicheHint: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  activityBody: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  activitySubtitle: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
});
