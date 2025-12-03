import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({
  visible,
  onClose,
  onConfirm,
}: LogoutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.logoutModalCard}>
          <Text style={styles.logoutModalTitle}>정말로 로그아웃 하시겠어요?</Text>
          <Text style={styles.logoutModalText}>
            다시 로그인 하려면 계정 인증이 필요합니다.
          </Text>
          <Pressable 
            style={styles.logoutModalCancelButton} 
            onPress={onClose}
          >
            <Text style={styles.logoutModalCancelButtonText}>취소</Text>
          </Pressable>
          <Pressable 
            style={styles.logoutModalLogoutButton} 
            onPress={onConfirm}
          >
            <Text style={styles.logoutModalLogoutButtonText}>로그아웃</Text>
          </Pressable>
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
  logoutModalCard: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: 24,
    width: 320,
    height: 208,
  },
  logoutModalTitle: {
    position: 'absolute',
    left: 40,
    top: 50,
    width: 240,
    height: 24,
    ...textStyles.h5,
    textAlign: 'center',
  },
  logoutModalText: {
    position: 'absolute',
    left: 40,
    top: 80,
    width: 240,
    height: 40,
    ...textStyles.body4,
    color: colors.gray600,
    textAlign: 'center',
  },
  logoutModalCancelButton: {
    position: 'absolute',
    left: 24,
    bottom: 40,
    width: 132,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray300,
  },
  logoutModalCancelButtonText: {
    ...textStyles.h7,
  },
  logoutModalLogoutButton: {
    position: 'absolute',
    right: 24,
    bottom: 40,
    width: 132,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
  },
  logoutModalLogoutButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});

