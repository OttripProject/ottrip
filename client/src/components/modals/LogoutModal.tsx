import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isGuest?: boolean;
  onSignUp?: () => void;
}

export default function LogoutModal({
  visible,
  onClose,
  onConfirm,
  isGuest = false,
  onSignUp,
}: LogoutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.logoutModalCard,
            isGuest && styles.logoutModalCardGuest,
          ]}
        >
          {isGuest ? (
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.guestScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.logoutModalTitle}>
                정말로 로그아웃 하시겠어요?
              </Text>
              <Text style={styles.logoutModalText}>
                현재 게스트로 사용중입니다. {'\n'}
                로그아웃 시 모든 데이터가 삭제됩니다. {'\n'}
                그래도 로그아웃 하시겠습니까?
              </Text>
              <View style={styles.logoutModalButtonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.footerButton,
                    styles.footerButtonGray,
                    pressed && styles.pressed,
                  ]}
                  onPress={onConfirm}
                >
                  <Text style={styles.footerButtonTextDark}>로그아웃</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.footerButton,
                    styles.footerButtonPrimary,
                    pressed && styles.pressed,
                  ]}
                  onPress={onSignUp}
                >
                  <Text style={styles.footerButtonTextLight}>회원가입</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <>
              <Text style={styles.logoutModalTitle}>
                정말로 로그아웃 하시겠어요?
              </Text>
              <Text style={styles.logoutModalText}>
                다시 로그인 하려면 계정 인증이 필요합니다.
              </Text>
              <View style={styles.logoutModalButtonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.footerButton,
                    styles.footerButtonGray,
                    pressed && styles.pressed,
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.footerButtonTextDark}>취소</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.footerButton,
                    styles.footerButtonDanger,
                    pressed && styles.pressed,
                  ]}
                  onPress={onConfirm}
                >
                  <Text style={styles.footerButtonTextLight}>로그아웃</Text>
                </Pressable>
              </View>
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
  logoutModalCard: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: 24,
    width: 320,
    minHeight: 208,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  logoutModalCardGuest: {
    maxHeight: '80%',
  },
  guestScrollContent: {
    paddingBottom: 4,
  },
  logoutModalTitle: {
    ...textStyles.h5,
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutModalText: {
    ...textStyles.body4,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  logoutModalButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerButton: {
    width: 132,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonGray: {
    backgroundColor: colors.gray300,
  },
  footerButtonDanger: {
    backgroundColor: colors.warning,
  },
  footerButtonPrimary: {
    backgroundColor: colors.primary,
  },
  footerButtonTextDark: {
    ...textStyles.h7,
    color: colors.black,
  },
  footerButtonTextLight: {
    ...textStyles.h7,
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});

