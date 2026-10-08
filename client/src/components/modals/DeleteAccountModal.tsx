import { useBackdropClose } from "@/hooks/useBackdropClose";
import MotionPressable from "@/ui/components/MotionPressable";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

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
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsCompleted(false);
      setIsDeleting(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      setIsCompleted(true);
    } catch (_error) {
      setIsDeleting(false);
    }
  };

  const handleDone = () => {
    onCompleted?.();
    onClose();
  };

  const handleRequestClose = () => {
    if (isCompleted) handleDone();
    else if (!isDeleting) onClose();
  };

  const backdrop = useBackdropClose(handleRequestClose);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
    >
      <View style={styles.overlay} {...backdrop.overlayProps}>
        <View style={styles.card} {...backdrop.cardProps}>
          {isCompleted ? (
            <>
              <Text style={[styles.title, styles.completedTitle]}>
                계정이 삭제되었어요.
              </Text>
              <View style={styles.buttonRow}>
                <MotionPressable
                  style={[styles.button, styles.buttonDark]}
                  onPress={handleDone}
                >
                  <Text style={styles.buttonTextLight}>확인</Text>
                </MotionPressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>정말 계정을 삭제하시겠어요?</Text>
              <Text style={styles.description}>
                {
                  "계정을 삭제하면 지금까지 만든 여행 일정이\n모두 사라지며, 다시 복구할 수 없어요."
                }
              </Text>
              <View style={styles.buttonRow}>
                <MotionPressable
                  style={[
                    styles.button,
                    styles.buttonMuted,
                    isDeleting && styles.buttonDisabled,
                  ]}
                  onPress={onClose}
                  disabled={isDeleting}
                >
                  <Text style={styles.buttonTextDark}>취소</Text>
                </MotionPressable>
                <MotionPressable
                  style={[
                    styles.button,
                    styles.buttonDanger,
                    isDeleting && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={isDeleting}
                >
                  <Text style={styles.buttonTextLight}>삭제</Text>
                </MotionPressable>
              </View>
            </>
          )}
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
  completedTitle: {
    marginBottom: spacing.lg,
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
  buttonDark: {
    ...surfaces.dark,
  },
  buttonDisabled: {
    opacity: 0.6,
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
