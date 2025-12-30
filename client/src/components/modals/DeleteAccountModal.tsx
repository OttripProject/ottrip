import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onCompleted?: () => void;
}

export default function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  onCompleted,
}: DeleteAccountModalProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsCompleted(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    try {
      await onConfirm();
      setIsCompleted(true);
    } catch (error) {
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.deleteModalCard}>
          {isCompleted ? (
            <>
              <Text style={styles.deleteModalCompletedTitle}>계정이 삭제되었어요.</Text>
              <Pressable 
                style={styles.deleteModalConfirmButton} 
                onPress={() => {
                  if (onCompleted) {
                    onCompleted();
                  }
                  onClose();
                }}
              >
                <Text style={styles.deleteModalConfirmButtonText}>확인</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.deleteModalTitle}>정말 계정을 삭제하시겠어요?</Text>
              <Text style={styles.deleteModalText}>
                계정을 삭제하면 지금까지 만든 여행 일정이 {'\n'}
                모두 사라지며, 다시 복구할 수 없어요.
              </Text>
              <Pressable 
                style={styles.deleteModalCancelButton} 
                onPress={onClose}
              >
                <Text style={styles.deleteModalCancelButtonText}>취소</Text>
              </Pressable>
              <Pressable 
                style={styles.deleteModalDeleteButton} 
                onPress={handleConfirm}
              >
                <Text style={styles.deleteModalDeleteButtonText}>삭제</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  deleteModalCard: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: 24,
    width: 320,
    height: 208,
  },
  deleteModalTitle: {
    position: 'absolute',
    left: 69,
    top: 32,
    width: 182,
    height: 24,
    ...textStyles.h5,
    textAlign: 'center',
  },
  deleteModalText: {
    position: 'absolute',
    left: 49,
    top: 72,
    width: 221,
    height: 40,
    ...textStyles.body4,
    color: colors.gray600,
    textAlign: 'center',
  },
  deleteModalCancelButton: {
    position: 'absolute',
    left: 24,
    bottom: 24,
    width: 132,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray300,
  },
  deleteModalCancelButtonText: {
    ...textStyles.h7,
  },
  deleteModalDeleteButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 132,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
  },
  deleteModalDeleteButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
  deleteModalCompletedTitle: {
    position: 'absolute',
    left: 40,
    top: 72,
    width: 240,
    height: 24,
    ...textStyles.h5,
    textAlign: 'center',
  },
  deleteModalConfirmButton: {
    position: 'absolute',
    left: 88,
    top: 110,
    width: 144,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  deleteModalConfirmButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});

