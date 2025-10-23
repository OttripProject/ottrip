import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
