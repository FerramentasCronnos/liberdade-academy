import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { MOCK_PRODUCTS } from '../../src/services/mockData';

function formatPrice(price: number) {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatViews(views: number) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`;
  return String(views);
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useMemo(
    () => MOCK_PRODUCTS.find((p) => p.id === id) ?? MOCK_PRODUCTS[0],
    [id],
  );

  const onShare = async () => {
    await Share.share({
      message: `Confira ${product.name} por ${formatPrice(product.price)} — Liberdade Academy`,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Produto</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onShare}>
          <Ionicons name="share-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: product.image }} style={styles.image} />
          {product.isViral && (
            <View style={styles.viralBadge}>
              <Ionicons name="flame" size={12} color="#FFF" />
              <Text style={styles.viralText}>Viral TikTok</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="star" size={14} color={COLORS.gold} />
            <Text style={styles.metaText}>{product.rating}</Text>
          </View>
          {product.tiktokViews != null && (
            <View style={styles.metaChip}>
              <Ionicons name="logo-tiktok" size={14} color={COLORS.text} />
              <Text style={styles.metaText}>{formatViews(product.tiktokViews)} views</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Ionicons name="cash-outline" size={14} color={COLORS.success} />
            <Text style={styles.metaText}>{product.commission}% comissão</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Descrição</Text>
          <Text style={styles.cardBody}>{product.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fornecedor</Text>
          <View style={styles.supplierRow}>
            <View style={styles.supplierIcon}>
              <Ionicons name="storefront" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supplierName}>{product.supplier}</Text>
              <Text style={styles.supplierHint}>
                {product.supplierShips
                  ? 'Envio direto para a casa do cliente — sem estoque'
                  : 'Produto digital — entrega automática'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.cta} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Quero vender este produto</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingHorizontal: SPACING.lg,
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
  content: {
    paddingHorizontal: SPACING.lg,
  },
  imageWrap: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  image: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.borderLight,
  },
  viralBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  viralText: {
    color: '#FFF',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
  },
  name: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  price: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    marginBottom: SPACING.lg,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    ...SHADOWS.small,
  },
  metaText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  cardBody: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  supplierIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierName: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  supplierHint: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cta: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.medium,
  },
  ctaText: {
    color: '#FFF',
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
  },
});
