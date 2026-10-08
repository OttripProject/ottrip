import MotionPressable from "@/ui/components/MotionPressable";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { Modal, StyleSheet, Text, View } from "react-native";

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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>정말로 로그아웃 하시겠어요?</Text>
          <Text style={styles.description}>
            {isGuest
              ? "현재 게스트로 사용중입니다.\n로그아웃 시 모든 데이터가 삭제됩니다.\n그래도 로그아웃 하시겠습니까?"
              : "다시 로그인 하려면 계정 인증이 필요합니다."}
          </Text>
          <View style={styles.buttonRow}>
            {isGuest ? (
              <>
                <MotionPressable
                  style={[styles.button, styles.buttonMuted]}
                  onPress={onConfirm}
                >
                  <Text style={styles.buttonTextDark}>로그아웃</Text>
                </MotionPressable>
                <MotionPressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={onSignUp}
                >
                  <Text style={styles.buttonTextLight}>회원가입</Text>
                </MotionPressable>
              </>
            ) : (
              <>
                <MotionPressable
                  style={[styles.button, styles.buttonMuted]}
                  onPress={onClose}
                >
                  <Text style={styles.buttonTextDark}>취소</Text>
                </MotionPressable>
                <MotionPressable
                  style={[styles.button, styles.buttonDanger]}
                  onPress={onConfirm}
                >
                  <Text style={styles.buttonTextLight}>로그아웃</Text>
                </MotionPressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...modalMotion.overlay,
    flex: 1,
    ...surfaces.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lgPlus,
  },
  card: {
    ...modalMotion.card,
    width: 320 + spacing.xl * 2,
    maxWidth: "100%",
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadows.xl,
  },
  title: {
    ...textStyles.h5,
    color: colors.gray900,
    textAlign: "center",
  },
  description: {
    ...textStyles.body5,
    color: colors.gray700,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonMuted: {
    ...surfaces.muted,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonPrimary: {
    ...surfaces.primary,
  },
  buttonTextDark: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  buttonTextLight: {
    ...textStyles.h7,
    color: colors.white,
  },
});
