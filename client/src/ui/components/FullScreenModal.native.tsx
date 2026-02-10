import React, { ReactNode } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/ui/tokens/colors';

interface FullScreenModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function FullScreenModal({
  visible,
  onClose,
  children,
}: FullScreenModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
