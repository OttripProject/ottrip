import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';

const BORDER_INPUT = '#E2E2E2';
const BLUE_PILL = '#0A84FF';
const BLUE_PILL_BG = '#E5F0FF';
const ORANGE_PILL = '#E07000';
const ORANGE_PILL_BG = '#FFF1E5';
const BTN_CANCEL_BG = '#EDEDED';

function getEntitySubtitle(entityTypeLabel: string): string {
  const t = entityTypeLabel.trim();
  if (t === '항공' || t.includes('항공')) {
    return '항공편 정보가 맞는지 확인 후 저장하세요';
  }
  if (t === '숙박' || t.includes('숙박')) {
    return '숙박 정보가 맞는지 확인 후 저장하세요';
  }
  return '일정 정보가 맞는지 확인 후 저장하세요';
}

function getBluePillText(entityTypeLabel: string): string {
  const t = entityTypeLabel.trim();
  if (t === '항공' || t.includes('항공')) {
    return 'AI가 추출한 항공편 정보';
  }
  if (t === '숙박' || t.includes('숙박')) {
    return 'AI가 추출한 숙박 정보';
  }
  return 'AI가 추출한 일정 정보';
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldControl}>{children}</View>
    </View>
  );
}

export interface AiDocumentAnalyzeModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  entityTypeLabel?: string;
  children?: React.ReactNode;
  onApply?: () => void;
  applyLabel?: string;
}

export default function AiDocumentAnalyzeModal({
  visible,
  onClose,
  title = '분석 결과 확인',
  entityTypeLabel = '일정',
  children,
  onApply,
  applyLabel = '저장',
}: AiDocumentAnalyzeModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(460, windowWidth - 32);
  const subtitle = getEntitySubtitle(entityTypeLabel);
  const bluePillText = getBluePillText(entityTypeLabel);

  const handleApply = () => {
    onApply?.();
    onClose();
  };

  const body =
    children != null ? (
      <View style={styles.childrenWrap}>{children}</View>
    ) : (
      <AiAnalyzeModalDesignMockWithPill bluePillText={bluePillText} />
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { width: cardWidth }]}
          onPress={e => e.stopPropagation?.()}
        >
          <View style={styles.cardInner}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalSubtitle}>{subtitle}</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel="닫기"
              >
                <Text style={styles.closeGlyph}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {body}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.footerBtn,
                  styles.footerBtnCancel,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.footerBtnCancelText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={handleApply}
                style={({ pressed }) => [
                  styles.footerBtn,
                  styles.footerBtnSave,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.footerBtnSaveText}>{applyLabel}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AiAnalyzeModalDesignMockWithPill({
  bluePillText,
}: {
  bluePillText: string;
}) {
  return (
    <>
      <View style={styles.pillBlue}>
        <View style={styles.pillDotBlue} />
        <Text style={styles.pillBlueText}>{bluePillText}</Text>
      </View>

      <View style={styles.fieldStack}>
        <FieldRow label="제목">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
        <FieldRow label="내용">
          <TextInput
            style={[styles.mockInput, styles.mockTextarea]}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
        <FieldRow label="국가">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
        <FieldRow label="도시">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
        <FieldRow label="장소">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
        <FieldRow label="날짜">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
        <FieldRow label="시작시간">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
        <FieldRow label="종료시간">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
      </View>

      <View style={[styles.pillOrange, styles.pillOrangeSpaced]}>
        <View style={styles.pillDotOrange} />
        <Text style={styles.pillOrangeText}>비용 내역</Text>
      </View>

      <View style={styles.fieldStack}>
        <FieldRow label="카테고리">
          <View style={styles.mockSelect} />
        </FieldRow>
        <FieldRow label="금액 (원)">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
            keyboardType="numeric"
          />
        </FieldRow>
        <FieldRow label="내용">
          <TextInput
            style={styles.mockInput}
            placeholderTextColor={colors.gray600}
          />
        </FieldRow>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    maxWidth: '100%',
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 24,
  },
  cardInner: {
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    margin: 0,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.gray900,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    color: colors.gray600,
  },
  closeButton: {
    width: 24,
    height: 24,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.gray900,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  scroll: {
    maxHeight: 480,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  childrenWrap: {
    gap: 12,
  },
  pillBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: BLUE_PILL_BG,
  },
  pillDotBlue: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: BLUE_PILL,
  },
  pillBlueText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    color: BLUE_PILL,
  },
  pillOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: ORANGE_PILL_BG,
  },
  pillOrangeSpaced: {
    marginTop: 6,
  },
  pillDotOrange: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: ORANGE_PILL,
  },
  pillOrangeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    color: ORANGE_PILL,
  },
  fieldStack: {
    flexDirection: 'column',
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldLabel: {
    width: 76,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.gray700,
  },
  fieldControl: {
    flex: 1,
    minWidth: 0,
  },
  mockInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: BORDER_INPUT,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.gray900,
  },
  mockTextarea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  mockSelect: {
    width: '100%',
    minHeight: 36,
    borderWidth: 1,
    borderColor: BORDER_INPUT,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 4,
  },
  footerBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnCancel: {
    backgroundColor: BTN_CANCEL_BG,
  },
  footerBtnCancelText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  footerBtnSave: {
    backgroundColor: colors.gray900,
  },
  footerBtnSaveText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.white,
  },
});
