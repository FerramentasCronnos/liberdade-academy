import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAppData } from '../../src/contexts/AppDataContext';
import { MOCK_PRODUCTS, CATEGORIES } from '../../src/services/mockData';
import { showAlert } from '../../src/utils/dialog';

const GRID_GAP = 12;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

const NICHE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  beleza: 'flower',
  saude: 'fitness',
  fisico: 'cube',
  digital: 'cloud-download',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { notifications, unreadCount, markNotificationsRead } = useAppData();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const firstName = user?.name?.split(' ')[0] ?? 'Membro';

  const gridProducts = useMemo(
    () => MOCK_PRODUCTS.filter((p) => p.isViral).slice(0, 4),
    [],
  );

  const niches = CATEGORIES.filter((c) =>
    ['beleza', 'saude', 'fisico', 'digital'].includes(c.id),
  );

  const goSearch = () => {
    router.push({ pathname: '/(tabs)/catalog', params: { q: query } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Menu"
          >
            <Ionicons name="menu" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Home</Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              markNotificationsRead();
              setNotifsOpen(true);
            }}
          >
            <View>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              {unreadCount > 0 && <View style={styles.dot} />}
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
            onSubmitEditing={goSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={goSearch}>
              <Ionicons name="arrow-forward-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          )}
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
              <Ionicons name="rocket" size={36} color={COLORS.accent} />
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
                    name="chevron-forward"
                    size={14}
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
          <Text style={styles.sectionTitle}>Atalhos</Text>
        </View>

        <View style={styles.shortcuts}>
          <TouchableOpacity
            style={styles.shortcut}
            onPress={() => router.push('/(tabs)/community')}
          >
            <Ionicons name="people" size={20} color={COLORS.primary} />
            <Text style={styles.shortcutText}>Comunidade</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcut}
            onPress={() => router.push('/(tabs)/ranking')}
          >
            <Ionicons name="trophy" size={20} color={COLORS.primary} />
            <Text style={styles.shortcutText}>Ranking</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcut}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="person" size={20} color={COLORS.primary} />
            <Text style={styles.shortcutText}>Perfil</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/(tabs)/profile');
              }}
            >
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Meu perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/(tabs)/catalog');
              }}
            >
              <Ionicons name="grid-outline" size={20} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Catálogo</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={notifsOpen} transparent animationType="slide" onRequestClose={() => setNotifsOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setNotifsOpen(false)}>
          <View style={styles.notifSheet}>
            <Text style={styles.menuTitle}>Notificações</Text>
            {notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={styles.notifItem}
                onPress={() => {
                  setNotifsOpen(false);
                  if (n.route) router.push(n.route as any);
                }}
              >
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifBody}>{n.body}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setNotifsOpen(false);
                showAlert('Tudo limpo', 'Notificações marcadas como lidas.');
              }}
            >
              <Text style={styles.closeBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    width: '100%',
    maxWidth: '100%',
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
    fontSize: 28,
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
    width: '100%',
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    outlineStyle: 'none' as unknown as undefined,
  },
  welcomeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.xxl,
    width: '100%',
    ...SHADOWS.medium,
  },
  welcomeText: {
    flex: 1,
    paddingRight: SPACING.md,
    minWidth: 0,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    width: '100%',
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
    width: '100%',
  },
  projectCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    maxWidth: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.md,
    minHeight: 160,
    ...SHADOWS.medium,
  },
  projectCardDark: {
    backgroundColor: COLORS.primary,
  },
  projectTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  projectDate: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  projectIconLight: {
    backgroundColor: COLORS.accentSoft,
  },
  projectIconOnDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  projectName: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    minHeight: 34,
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
    width: 118,
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
  shortcuts: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  shortcut: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.small,
  },
  shortcutText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 28, 51, 0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xxl,
    gap: 4,
  },
  notifSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xxl,
    maxHeight: '70%',
  },
  menuTitle: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  menuItemText: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  notifItem: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  notifTitle: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  notifBody: {
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 4,
  },
  closeBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFF',
    fontFamily: FONTS.bold,
  },
});
