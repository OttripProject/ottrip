import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import CloseIcon from '../../../../assets/mobile_close.svg';

interface AddScheduleAiPlaceholderModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddScheduleAiPlaceholderModal({
  visible,
  onClose,
}: AddScheduleAiPlaceholderModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.38}
      backdropOpacity={0.7}
      showDragHandle
    >
      <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI로 간편 추가</Text>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <CloseIcon width={20} height={20} color={colors.gray700} />
          </Pressable>
        </View>
        <Text style={styles.body}>곧 제공될 예정이에요.</Text>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 0,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.black,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    ...textStyles.body3,
    color: colors.gray600,
  },
});
