import { useWindowDimensions, Platform } from 'react-native';

export const LAYOUT = {
  maxContentWidth: 440,
  tabletBreakpoint: 768,
  desktopBreakpoint: 1024,
};

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 380;
  const isTablet = width >= LAYOUT.tabletBreakpoint;
  const isDesktop = width >= LAYOUT.desktopBreakpoint;
  const isWeb = Platform.OS === 'web';

  const contentWidth = Math.min(width, LAYOUT.maxContentWidth);
  const horizontalPadding = isCompact ? 16 : isTablet ? 28 : 22;
  const scale = isCompact ? 0.92 : 1;

  return {
    width,
    height,
    contentWidth,
    horizontalPadding,
    isCompact,
    isTablet,
    isDesktop,
    isWeb,
    scale,
    font: (size: number) => Math.round(size * scale),
  };
}
