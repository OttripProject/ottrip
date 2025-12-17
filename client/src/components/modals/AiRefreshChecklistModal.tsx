import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

interface RefreshChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RefreshChecklistModal({
  visible,
  onClose,
  onConfirm,
}: RefreshChecklistModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>계속 진행할까요?</Text>
          <Text style={styles.modalMessage}>
            추천 체크리스트가 추가됩니다.{'\n'}
          </Text>
          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.confirmButton]}
              onPress={onConfirm}
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
    minWidth: 320,
    maxWidth: 207,
  },
  modalTitle: {
    ...textStyles.h5,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    ...textStyles.body4,
    color: colors.gray700,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
  },
  confirmButton: {
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.black,
  },
  cancelButtonText: {
    ...textStyles.h7,
    color: colors.black,
  },
  confirmButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});

