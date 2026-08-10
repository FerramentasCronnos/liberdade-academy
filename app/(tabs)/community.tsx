import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { useAppData } from '../../src/contexts/AppDataContext';
import type { CommunityPost } from '../../src/types';
import { showAlert } from '../../src/utils/dialog';

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

function PostCard({
  post,
  onToggleLike,
}: {
  post: CommunityPost;
  onToggleLike: (id: string) => void;
}) {
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

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={() =>
            showAlert('Comentários', 'Em breve você poderá comentar nos posts da comunidade.')
          }
        >
          <Ionicons name="chatbubble-outline" size={19} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{formatCount(post.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={() =>
            Share.share({ message: `${post.author.name}: ${post.content}` }).catch(() => undefined)
          }
        >
          <Ionicons name="share-social-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  const { posts, addPost, toggleLike, refreshPosts } = useAppData();
  const [activeFilter, setActiveFilter] = useState('todos');
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftCategory, setDraftCategory] =
    useState<CommunityPost['category']>('dica');

  const filteredPosts =
    activeFilter === 'todos'
      ? posts
      : posts.filter((p) => p.category === activeFilter);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPosts(activeFilter);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPosts, activeFilter]);

  const publish = async () => {
    if (!draft.trim()) {
      showAlert('Atenção', 'Escreva algo antes de publicar.');
      return;
    }
    try {
      await addPost(draft, draftCategory);
      setDraft('');
      setComposerOpen(false);
      showAlert('Publicado!', 'Seu post já está na comunidade.');
    } catch (error: any) {
      showAlert('Erro', error.message || 'Não foi possível publicar.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Comunidade</Text>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.7}
          onPress={() => setComposerOpen(true)}
        >
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
                style={[styles.filterChip, isActive && { backgroundColor: filter.color }]}
                onPress={() => setActiveFilter(filter.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPosts}
        renderItem={({ item }) => <PostCard post={item} onToggleLike={toggleLike} />}
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
            <TouchableOpacity style={styles.emptyCta} onPress={() => setComposerOpen(true)}>
              <Text style={styles.emptyCtaText}>Criar primeiro post</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setComposerOpen(true)}
      >
        <LinearGradient
          colors={[COLORS.accent, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="create" size={24} color={COLORS.textLight} />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={composerOpen} transparent animationType="slide" onRequestClose={() => setComposerOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setComposerOpen(false)} />
          <View style={styles.composer}>
            <Text style={styles.composerTitle}>Nova publicação</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.composerCats}>
              {(['dica', 'resultado', 'duvida', 'motivacao'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.composerCat,
                    draftCategory === cat && { backgroundColor: CATEGORY_STYLES[cat].color },
                  ]}
                  onPress={() => setDraftCategory(cat)}
                >
                  <Text
                    style={[
                      styles.composerCatText,
                      draftCategory === cat && { color: '#FFF' },
                    ]}
                  >
                    {CATEGORY_STYLES[cat].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.composerInput}
              placeholder="Compartilhe uma dica, resultado ou dúvida..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={draft}
              onChangeText={setDraft}
              maxLength={500}
            />
            <View style={styles.composerActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setComposerOpen(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.publishBtn} onPress={publish}>
                <Text style={styles.publishText}>Publicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
    overflow: 'hidden',
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
    fontFamily: FONTS.bold,
    color: COLORS.textLight,
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
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textLight,
    fontFamily: FONTS.bold,
  },
  feedContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 130,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    width: '100%',
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
    fontFamily: FONTS.bold,
    color: COLORS.textLight,
  },
  authorInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    minWidth: 0,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
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
    fontFamily: FONTS.bold,
    color: COLORS.textLight,
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
    fontFamily: FONTS.bold,
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
    fontFamily: FONTS.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyCta: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  emptyCtaText: {
    color: '#FFF',
    fontFamily: FONTS.bold,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 28, 51, 0.45)',
    justifyContent: 'flex-end',
  },
  composer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xxl,
  },
  composerTitle: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  composerCats: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  composerCat: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  composerCatText: {
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  composerInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    textAlignVertical: 'top',
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    outlineStyle: 'none' as unknown as undefined,
  },
  composerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  publishBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  publishText: {
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
});
