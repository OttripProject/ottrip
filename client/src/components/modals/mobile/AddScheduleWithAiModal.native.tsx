import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import CloseIcon from '../../../../assets/mobile_close.svg';

interface AddScheduleWithAiModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddScheduleWithAiModal({
  visible,
  onClose,
}: AddScheduleWithAiModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.85}
      backdropOpacity={0.7}
      showDragHandle
    >
      <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.headerTitle}>AI 일정 추가</Text>
            <Text style={styles.body}>대화를 간편하게 일정을 등록하세요.</Text>
          </View>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
    gap: spacing.xs,
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
