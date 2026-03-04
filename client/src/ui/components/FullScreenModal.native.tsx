import React, { ReactNode } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/ui/tokens/colors';

interface FullScreenModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 상태바(시간, 배터리) 영역 배경색. 지정 시 iOS/Android 모두 적용 */
  containerBackgroundColor?: string;
}

export default function FullScreenModal({
  visible,
  onClose,
  children,
  containerBackgroundColor = colors.white,
}: FullScreenModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: containerBackgroundColor }]}>
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
