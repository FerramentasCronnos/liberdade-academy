import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, SHADOWS } from '../constants/theme';

type TabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<
    string,
    { options: { tabBarAccessibilityLabel?: string } }
  >;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const TAB_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  catalog: { label: 'Catálogo', icon: 'grid', iconOutline: 'grid-outline' },
  ranking: { label: 'Ranking', icon: 'trophy', iconOutline: 'trophy-outline' },
  profile: { label: 'Perfil', icon: 'person', iconOutline: 'person-outline' },
};

/** 2 à esquerda + FAB (comunidade) + 2 à direita — vibe da referência */
const LEFT_TABS = ['index', 'catalog'];
const RIGHT_TABS = ['ranking', 'profile'];

export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const currentRoute = state.routes[state.index]?.name;
  const communityFocused = currentRoute === 'community';

  const renderTab = (routeName: string) => {
    const routeIndex = state.routes.findIndex((r) => r.name === routeName);
    if (routeIndex < 0) return null;

    const route = state.routes[routeIndex];
    const focused = state.index === routeIndex;
    const config = TAB_CONFIG[routeName];
    if (!config) return null;

    const { options } = descriptors[route.key];

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        onPress={onPress}
        style={styles.tabItem}
        activeOpacity={0.7}
      >
        <Ionicons
          name={focused ? config.icon : config.iconOutline}
          size={22}
          color={focused ? COLORS.primary : COLORS.textMuted}
        />
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
          {config.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={styles.bar}>
        <View style={styles.side}>{LEFT_TABS.map(renderTab)}</View>

        <View style={styles.fabSlot}>
          <TouchableOpacity
            style={[styles.fab, communityFocused && styles.fabActive]}
            onPress={() => navigation.navigate('community')}
            activeOpacity={0.85}
            accessibilityLabel="Comunidade"
          >
            <Ionicons
              name={communityFocused ? 'people' : 'add'}
              size={communityFocused ? 26 : 30}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={[styles.fabLabel, communityFocused && styles.tabLabelActive]}>
            Comunidade
          </Text>
        </View>

        <View style={styles.side}>{RIGHT_TABS.map(renderTab)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.md,
    marginBottom: Platform.OS === 'ios' ? 0 : SPACING.sm,
    borderRadius: 28,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    ...SHADOWS.large,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    paddingVertical: 4,
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  fabSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    ...SHADOWS.large,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
  },
  fabActive: {
    backgroundColor: COLORS.accent,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
