import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import CloseIcon from '../../../../assets/mobile_close.svg';
import LightningIcon from '../../../../assets/mobile_lightning.svg';
import RightArrowIcon from '../../../../assets/right_arrow.svg';
import ManualIcon from '../../../../assets/update.svg';


interface AddScheduleMethodModalProps {
  visible: boolean;
  onClose: () => void;
  /** 직접 입력 — AddScheduleModal 연결 */
  onSelectDirectAdd: () => void;
  /** AI 간편 추가 (추후 연동, 현재는 비움) */
  onSelectAiAdd?: () => void;
}

export default function AddScheduleMethodModal({
  visible,
  onClose,
  onSelectDirectAdd,
  onSelectAiAdd,
}: AddScheduleMethodModalProps) {
  const insets = useSafeAreaInsets();

  const handleDirect = () => {
    onSelectDirectAdd();
  };

  const handleAi = () => {
    onSelectAiAdd?.();
  };

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
          <Text style={styles.headerTitle}>일정 추가 방법 선택</Text>
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

        {/* <Pressable
          style={({ pressed }) => [styles.cardAi, pressed && styles.cardPressed]}
          onPress={handleAi}
          accessibilityRole="button"
        >
          <View style={styles.iconCircle}>
            <LightningIcon width={20} height={20} color={colors.primary}/>
          </View>
          <View style={styles.cardTextBlock}>
            <Text style={styles.cardTitle}>AI로 간편 추가</Text>
            <Text style={styles.cardSubtitleAi}>대화하듯 편하게 등록하세요.</Text>
          </View>
          <RightArrowIcon width={20} height={20} color={colors.primary} />
        </Pressable> */}

        <Pressable
          style={({ pressed }) => [styles.cardManual, pressed && styles.cardPressed]}
          onPress={handleDirect}
          accessibilityRole="button"
        >
          <View style={styles.iconCircle}>
            <ManualIcon width={20} height={20} />
          </View>
          <View style={styles.cardTextBlock}>
            <Text style={styles.cardTitle}>직접 입력</Text>
            <Text style={styles.cardSubtitleManual}>상세 정보를 직접 입력하세요.</Text>
          </View>
          <RightArrowIcon width={20} height={20} color={colors.gray500} />
        </Pressable>
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
    marginBottom: 13,
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
  cardAi: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 8,
    gap: 12,
  },
  cardManual: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.gray200,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...textStyles.h6,
    color: colors.black,
    marginBottom: 2,
  },
  cardSubtitleAi: {
    ...textStyles.body4,
    color: colors.primary,
  },
  cardSubtitleManual: {
    ...textStyles.body4,
    color: colors.gray600,
  },
});
