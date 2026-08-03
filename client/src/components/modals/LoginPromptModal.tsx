import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import LockKeyholeIcon from "../../../assets/lock_keyhole.svg";

interface LoginPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginPress: () => void;
}

export default function LoginPromptModal({
  visible,
  onClose,
  onLoginPress,
}: LoginPromptModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconCircle}>
            <LockKeyholeIcon width={24} height={24} color={colors.gray900} />
          </View>

          <Text style={styles.title}>로그인이 필요해요</Text>

          <Text style={styles.description}>
            {
              "이 기능은 로그인이 필요한 기능입니다.\n로그인하시면 내 일정으로 저장할 수 있어요."
            }
          </Text>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable style={styles.loginButton} onPress={onLoginPress}>
              <Text style={styles.loginButtonText}>로그인</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 360,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.h4,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  description: {
    ...textStyles.body4,
    color: colors.gray700,
    textAlign: "center",
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.gray300,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    ...textStyles.h6,
    color: colors.gray900,
  },
  loginButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.gray900,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
