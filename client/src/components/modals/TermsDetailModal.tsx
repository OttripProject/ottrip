import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { TERMS, type TermsKey } from '@/constants/terms';
import { textStyles } from '@/ui/tokens/typography';
import { colors } from '@/ui/tokens/colors';

import XIcon from '../../../assets/x.svg';

const FIGMA_CARD_WIDTH = 480;
const FIGMA_SCROLL_BODY_HEIGHT = 333;
const FIGMA_CONFIRM_WIDTH = 196;
const FIGMA_CONFIRM_HEIGHT = 56;

export type TermsDetailModalProps = {
  visible: boolean;
  termsKey: TermsKey;
  onClose: () => void;
  maxWidth?: number;
};

export default function TermsDetailModal({
  visible,
  termsKey,
  onClose,
  maxWidth = FIGMA_CARD_WIDTH,
}: TermsDetailModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const doc = TERMS[termsKey];
  const isCompact = maxWidth < FIGMA_CARD_WIDTH;

  const headerTitle = doc.detailModalTitle ?? doc.title;

  const scrollBodyHeight = useMemo(() => {
    if (isCompact) {
      return Math.min(280, Math.round(windowHeight * 0.38));
    }
    return Math.min(FIGMA_SCROLL_BODY_HEIGHT, Math.round(windowHeight * 0.46));
  }, [isCompact, windowHeight]);

  const cardMaxHeight = useMemo(
    () => Math.min(Math.round(windowHeight * 0.92), 720),
    [windowHeight],
  );

  const horizontalPad = isCompact ? 20 : 40;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              maxWidth,
              paddingHorizontal: horizontalPad,
              maxHeight: cardMaxHeight,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {headerTitle}
            </Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="닫기"
            >
              <XIcon width={24} height={24} fill={colors.black} />
            </Pressable>
          </View>

          {doc.effectiveDate ? (
            <Text style={styles.effectiveDate}>{doc.effectiveDate}</Text>
          ) : null}

          <View style={styles.divider} />

          <View style={[styles.scrollBox, { height: scrollBodyHeight }]}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              bounces
            >
              <Text style={styles.content}>{doc.content}</Text>
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={styles.confirmButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="확인"
            >
              <Text style={styles.confirmButtonText}>확인</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    ...textStyles.h2,
    color: colors.black,
    flex: 1,
  },
  closeButton: {
    width: 24,
    height: 24,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  effectiveDate: {
    ...textStyles.body3,
    color: colors.gray700,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginBottom: 16,
  },
  scrollBox: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  scrollView: {
    width: '100%',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  content: {
    ...textStyles.body3,
    color: colors.black,
  },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    width: FIGMA_CONFIRM_WIDTH,
    height: FIGMA_CONFIRM_HEIGHT,
    backgroundColor: colors.gray900,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});
