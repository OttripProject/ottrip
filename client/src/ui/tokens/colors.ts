export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#FAFAFA',
  gray200: '#F4F4F4',
  gray300: '#EDEDED',
  gray400: '#D4D4D4',
  gray500: '#B3B3B3',
  gray600: '#9B9B9B',
  gray700: '#6C6C6C',
  gray800: '#373737',
  gray900: '#1F1F1F',
  primary: '#007AFF',
  primaryDark: '#0059B2',
  danger: '#EF4444',  
  success: '#0066FF',
  warning: '#FF4242',
  gradientStart: '#FFD7EB',
  gradientEnd: '#BADFFF',
  gradientAIColors: ['#D7D0FF4D', '#CBDDFF99'] as const,
  gradientAIRefresh: ['#9CBEFF', '#B4A7FF'] as const,
  overlayBackground: 'rgba(0, 0, 0, 0.7)',
};

export type ColorName = keyof typeof colors;


