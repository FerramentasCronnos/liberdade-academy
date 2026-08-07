import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS } from '../constants/theme';
import { LAYOUT } from '../constants/layout';

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <View style={styles.nativeRoot}>{children}</View>;
  }

  const phoneWidth = Math.min(width - 24, LAYOUT.maxContentWidth);
  const phoneHeight = Math.min(height - 24, 900);

  return (
    <View style={styles.page}>
      <View style={[styles.phone, { width: phoneWidth, height: phoneHeight }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  page: {
    flex: 1,
    width: '100%',
    minHeight: '100%' as unknown as number,
    backgroundColor: '#DCE3EE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  phone: {
    backgroundColor: COLORS.background,
    borderRadius: 28,
    overflow: 'hidden',
    maxWidth: '100%',
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
  },
});
