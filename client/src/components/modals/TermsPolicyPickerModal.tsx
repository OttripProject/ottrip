import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import type { TermsKey } from '@/constants/terms';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

import XIcon from '../../../assets/x.svg';
import RightArrowTermIcon from '../../../assets/right_arrow_term.svg';

const FIGMA_CARD_HEIGHT = 327;
const DEFAULT_MAX_WIDTH = 480;

export type TermsPolicyPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onPickTerm: (key: TermsKey) => void;
  maxWidth?: number;
  dimBackdrop?: boolean;
};

export default function TermsPolicyPickerModal({
  visible,
  onClose,
  onPickTerm,
  maxWidth = DEFAULT_MAX_WIDTH,
  dimBackdrop = true,
}: TermsPolicyPickerModalProps) {
  const handlePick = (key: TermsKey) => {
    onPickTerm(key);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, !dimBackdrop && styles.overlayNoDim]}>
        <View style={[styles.card, { maxWidth, width: '100%' }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>약관 및 정책</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="닫기"
            >
              <XIcon width={24} height={24} fill={colors.black} />
            </Pressable>
          </View>

          <View style={styles.options}>
            <Pressable
              style={styles.optionBox}
              onPress={() => handlePick('tos')}
              accessibilityRole="button"
            >
              <Text style={styles.optionLabel} numberOfLines={2}>
                [필수] 서비스 이용 약관
              </Text>
              <RightArrowTermIcon style={styles.chevron} />
            </Pressable>
            <Pressable
              style={styles.optionBox}
              onPress={() => handlePick('privacy')}
              accessibilityRole="button"
            >
              <Text style={styles.optionLabel} numberOfLines={2}>
                [필수] 개인정보 수집 및 이용
              </Text>
              <RightArrowTermIcon style={styles.chevron} />
            </Pressable>
            <Pressable
              style={styles.optionBox}
              onPress={() => handlePick('marketing')}
              accessibilityRole="button"
            >
              <Text style={styles.optionLabel} numberOfLines={2}>
                [선택] 이벤트·혜택 정보 수신 및 활용 동의
              </Text>
              <RightArrowTermIcon style={styles.chevron} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayNoDim: {
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    minHeight: FIGMA_CARD_HEIGHT,
    paddingHorizontal: 40,
    paddingTop: 48,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    ...textStyles.h2,
    color: colors.black,
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    gap: 8,
  },
  optionBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionLabel: {
    ...textStyles.body4,
    color: colors.black,
    flex: 1,
    marginRight: 12,
  },
  chevron: {
    width: 16,
    height: 16,
  },
});
