import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { MOCK_PRODUCTS, CATEGORIES } from '../../src/services/mockData';
import { fetchCatalogProducts } from '../../src/services/calodataApi';
import type { Product } from '../../src/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 2 - SPACING.md) / 2;

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return `${views}`;
}

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const [selectedCategory, setSelectedCategory] = useState(params.category ?? 'todos');
  const [searchQuery, setSearchQuery] = useState(params.q ?? '');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [sourceLabel, setSourceLabel] = useState('Catálogo local');

  const loadProducts = useCallback(async () => {
    const result = await fetchCatalogProducts({
      category: selectedCategory,
      query: searchQuery,
    });
    setProducts(result.products.length ? result.products : MOCK_PRODUCTS);
    setSourceLabel(result.fromApi ? 'Kalodata · TikTok' : 'Demo · atualizado diariamente');
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    if (params.category) setSelectedCategory(params.category);
    if (params.q) setSearchQuery(params.q);
  }, [params.category, params.q]);

  useEffect(() => {
    setLoading(true);
    loadProducts().finally(() => setLoading(false));
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'todos') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  const renderProductCard = useCallback(
    ({ item, index }: { item: Product; index: number }) => {
      const highlighted = index % 4 === 0;
      return (
        <TouchableOpacity
          style={[styles.card, highlighted && styles.cardHighlight]}
          activeOpacity={0.85}
          onPress={() => router.push(`/product/${item.id}`)}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image }} style={styles.productImage} />
            {item.isViral && (
              <View style={styles.viralBadge}>
                <Ionicons name="flame" size={10} color="#FFF" />
                <Text style={styles.viralBadgeText}>Viral</Text>
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <Text
              style={[styles.productName, highlighted && styles.textOnDark]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <Text style={[styles.productPrice, highlighted && styles.textOnDark]}>
              {formatPrice(item.price)}
            </Text>

            <View style={styles.ratingRow}>
              <Ionicons
                name="star"
                size={12}
                color={highlighted ? COLORS.gold : COLORS.gold}
              />
              <Text style={[styles.ratingText, highlighted && styles.textOnDarkMuted]}>
                {item.rating}
              </Text>
              {item.tiktokViews != null && (
                <Text style={[styles.viewsText, highlighted && styles.textOnDarkMuted]}>
                  · {formatViews(item.tiktokViews)}
                </Text>
              )}
            </View>

            <Text style={[styles.commissionText, highlighted && { color: '#86EFAC' }]}>
              {item.commission}% comissão
            </Text>

            {item.supplierShips && (
              <View style={[styles.shippingBadge, highlighted && styles.shippingOnDark]}>
                <Ionicons
                  name="airplane"
                  size={10}
                  color={highlighted ? '#FFFFFF' : COLORS.success}
                />
                <Text style={[styles.shippingText, highlighted && styles.textOnDark]}>
                  Envio direto
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catálogo</Text>
        <Text style={styles.headerSubtitle}>3.000+ produtos virais validados</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sourceRow}>
          <Ionicons name="logo-tiktok" size={14} color={COLORS.accent} />
          <Text style={styles.sourceText}>{sourceLabel}</Text>
        </View>
      </View>

      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={16}
                  color={isSelected ? '#FFF' : COLORS.primary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Tente outro termo ou altere o nicho
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxxl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    height: 48,
    gap: SPACING.sm,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
  },
  sourceText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
  },
  categoriesWrapper: {
    paddingBottom: SPACING.md,
  },
  categoriesContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
    ...SHADOWS.small,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  categoryChipTextSelected: {
    color: '#FFF',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  cardHighlight: {
    backgroundColor: COLORS.primary,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.85,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  viralBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  viralBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
  cardContent: {
    padding: SPACING.md,
  },
  productName: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: SPACING.xs,
    minHeight: 36,
  },
  productPrice: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  textOnDark: {
    color: '#FFF',
  },
  textOnDarkMuted: {
    color: 'rgba(255,255,255,0.75)',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  ratingText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  viewsText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  commissionText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  shippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  shippingOnDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shippingText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    color: COLORS.success,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
