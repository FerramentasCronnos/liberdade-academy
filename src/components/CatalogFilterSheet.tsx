import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { LAYOUT } from '../constants/layout';
import {
  DEFAULT_FILTERS,
  SORT_OPTIONS,
  applyCatalogFilters,
  type CatalogFilters,
} from '../constants/catalog';
import type { Product } from '../types';

interface Props {
  visible: boolean;
  filters: CatalogFilters;
  /** Lista já filtrada por nicho/busca — base pra prévia da contagem. */
  products: Product[];
  onClose: () => void;
  onApply: (filters: CatalogFilters) => void;
}

/**
 * Painel de filtros do catálogo.
 *
 * Edita uma cópia local e só devolve no "Aplicar" — assim dá pra mexer sem a
 * lista piscando a cada toque, e o "Cancelar" descarta de verdade.
 */
export function CatalogFilterSheet({
  visible,
  filters,
  products,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<CatalogFilters>(filters);

  // Prévia ao vivo: o botão mostra quantos produtos o rascunho devolveria.
  const resultCount = useMemo(
    () => applyCatalogFilters(products, draft).length,
    [products, draft],
  );

  // Reabrir o painel deve mostrar o que está valendo, não o rascunho anterior.
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const update = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const onlyDigits = (value: string) => value.replace(/[^0-9]/g, '');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={styles.title}>Filtros</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Ordenar por</Text>
            <View style={styles.sortGrid}>
              {SORT_OPTIONS.map((option) => {
                const active = draft.sort === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                    onPress={() => update('sort', option.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={option.icon as never}
                      size={15}
                      color={active ? '#FFF' : COLORS.primary}
                    />
                    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Faixa de preço</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <Text style={styles.pricePrefix}>R$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="mín."
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  inputMode="numeric"
                  value={draft.minPrice}
                  onChangeText={(value) => update('minPrice', onlyDigits(value))}
                />
              </View>
              <View style={styles.priceDash} />
              <View style={styles.priceField}>
                <Text style={styles.pricePrefix}>R$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="máx."
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  inputMode="numeric"
                  value={draft.maxPrice}
                  onChangeText={(value) => update('maxPrice', onlyDigits(value))}
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Destaques</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={[styles.toggleIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="flame" size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Só produtos virais</Text>
                  <Text style={styles.toggleHint}>Alto volume de vendas no TikTok</Text>
                </View>
              </View>
              <Switch
                value={draft.onlyViral}
                onValueChange={(value) => update('onlyViral', value)}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={[styles.toggleIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="airplane" size={16} color={COLORS.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Só envio direto</Text>
                  <Text style={styles.toggleHint}>Fornecedor entrega ao cliente</Text>
                </View>
              </View>
              <Switch
                value={draft.onlyDirectShipping}
                onValueChange={(value) => update('onlyDirectShipping', value)}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setDraft(DEFAULT_FILTERS)}
              activeOpacity={0.7}
            >
              <Text style={styles.clearBtnText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => onApply(draft)}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>
                Ver {resultCount} {resultCount === 1 ? 'produto' : 'produtos'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    maxHeight: '86%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    ...SHADOWS.large,
  },
  grabber: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortChipText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  priceField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 46,
  },
  pricePrefix: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  priceInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  priceDash: {
    width: 10,
    height: 1.5,
    backgroundColor: COLORS.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  toggleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  toggleIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  toggleHint: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.lg,
  },
  clearBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtnText: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  applyBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});
