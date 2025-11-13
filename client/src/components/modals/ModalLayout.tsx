import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { radii } from '@/ui/tokens/radii';
import { colors } from '@/ui/tokens/colors';

interface ModalLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ModalLayout({ children, style }: ModalLayoutProps) {
  return (
    <View style={[styles.modal, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    elevation: 3,
  },
});
