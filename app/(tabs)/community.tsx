import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { MOCK_POSTS } from '../../src/services/mockData';
import type { CommunityPost } from '../../src/types';

const CATEGORY_FILTERS = [
  { id: 'todos', label: 'Todos', color: COLORS.accent },
  { id: 'dica', label: 'Dicas', color: COLORS.info },
  { id: 'resultado', label: 'Resultados', color: COLORS.success },
  { id: 'duvida', label: 'Dúvidas', color: COLORS.warning },
  { id: 'motivacao', label: 'Motivação', color: '#8B5CF6' },
] as const;

const CATEGORY_STYLES: Record<CommunityPost['category'], { color: string; bg: string; label: string }> = {
  dica: { color: COLORS.info, bg: '#EBF5FF', label: 'Dica' },
  resultado: { color: COLORS.success, bg: '#ECFDF5', label: 'Resultado' },
  duvida: { color: COLORS.warning, bg: '#FFFBEB', label: 'Dúvida' },
  motivacao: { color: '#8B5CF6', bg: '#F3E8FF', label: 'Motivação' },
};

const AVATAR_COLORS = ['#4A6FA5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} sem`;
  return `há ${Math.floor(diffDays / 30)} mês${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
  return n.toString();
}

interface PostCardProps {
  post: CommunityPost;
  onToggleLike: (id: string) => void;
}

function PostCard({ post, onToggleLike }: PostCardProps) {
  const categoryStyle = CATEGORY_STYLES[post.category];
  const avatarColor = getAvatarColor(post.author.name);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{getInitials(post.author.name)}</Text>
        </View>
        <View style={styles.authorInfo}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName}>{post.author.name}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Nível {post.author.level}</Text>
            </View>
          </View>
          <Text style={styles.timestamp}>{getRelativeTime(post.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
        <View style={[styles.categoryDot, { backgroundColor: categoryStyle.color }]} />
        <Text style={[styles.categoryText, { color: categoryStyle.color }]}>
          {categoryStyle.label}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onToggleLike(post.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? COLORS.error : COLORS.textSecondary}
          />
          <Text style={[styles.actionText, post.isLiked && { color: COLORS.error }]}>
            {formatCount(post.likes)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={19} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{formatCount(post.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  const [activeFilter, setActiveFilter] = useState('todos');
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS);
  const [refreshing, setRefreshing] = useState(false);

  const filteredPosts =
    activeFilter === 'todos'
      ? posts
      : posts.filter((p) => p.category === activeFilter);

  const handleToggleLike = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p,
      ),
    );
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setPosts(MOCK_POSTS);
      setRefreshing(false);
    }, 1200);
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PostCard post={item} onToggleLike={handleToggleLike} />
    ),
    [handleToggleLike],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Comunidade</Text>
        <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="add" size={26} color={COLORS.textLight} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {CATEGORY_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: filter.color },
                ]}
                onPress={() => setActiveFilter(filter.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum post encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Seja o primeiro a compartilhar nesta categoria!
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <LinearGradient
          colors={[COLORS.accent, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={COLORS.textLight} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.3,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filtersContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filtersScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textLight,
    fontWeight: '600',
  },

  feedContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 100,
  },

  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.5,
  },
  authorInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  authorName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  levelBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryDark,
  },
  levelText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  postContent: {
    fontSize: FONTS.sizes.lg,
    lineHeight: 24,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: SPACING.md,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.md,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
  },
  actionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 110,
    right: SPACING.xl,
    ...SHADOWS.large,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
