import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

interface InsufficientScheduleModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function InsufficientScheduleModal({
  visible,
  onClose,
}: InsufficientScheduleModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>일정이 부족해요</Text>
          <Text style={styles.modalMessage}>
            여행 일정이 아직 충분하지 않아{'\n'}
            AI 체크리스트를 만들 수 없어요.{'\n'}
            일정을 조금 더 추가해 주세요.
          </Text>
          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.modalButton, styles.confirmButton]}
              onPress={onClose}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 280,
    maxWidth: 320,
  },
  modalTitle: {
    ...textStyles.h5,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalMessage: {
    ...textStyles.body4,
    color: colors.gray700,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.black,
  },
  confirmButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});

