import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { radii } from '@/ui/tokens/radii';
import { colors } from '@/ui/tokens/colors';

interface PanelLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function PanelLayout({ children, style }: PanelLayoutProps) {
  return (
    <View style={[styles.panel, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    elevation: 3,
  },
});
