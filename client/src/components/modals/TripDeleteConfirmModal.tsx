import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

interface TripDeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  tripName: string;
  onConfirm: () => void;
}

export default function TripDeleteConfirmModal({
  visible,
  onClose,
  tripName,
  onConfirm,
}: TripDeleteConfirmModalProps) {
  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.deleteModalOverlay}>
        <View style={styles.deleteModalCard}>
          <Text style={styles.deleteModalTitle}>정말 이 여행을 삭제하시겠어요?</Text>
          <Text style={styles.deleteModalText}>
            "{tripName}" 여행을 삭제하면{'\n'}
            이 여행에 속한 모든 일정, 항공편,{'\n'}
            숙소 및 비용 데이터가 영구적으로 삭제됩니다.{'\n'}
            이 작업은 되돌릴 수 없습니다.
          </Text>
          <View style={styles.deleteModalButtons}>
            <Pressable 
              style={styles.deleteModalCancelButton} 
              onPress={onClose}
            >
              <Text style={styles.deleteModalCancelButtonText}>취소</Text>
            </Pressable>
            <Pressable 
              style={styles.deleteModalDeleteButton} 
              onPress={onConfirm}
            >
              <Text style={styles.deleteModalDeleteButtonText}>삭제</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalCard: {
    width: 320,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  deleteModalTitle: {
    ...textStyles.h5,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteModalText: {
    ...textStyles.body4,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  deleteModalCancelButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray300,
    marginRight: 6,
  },
  deleteModalCancelButtonText: {
    ...textStyles.h7,
  },
  deleteModalDeleteButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4242',
    marginLeft: 6,
  },
  deleteModalDeleteButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});

