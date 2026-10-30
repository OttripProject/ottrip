import { useBackdropClose } from "@/hooks/useBackdropClose";
import MotionPressable from "@/ui/components/MotionPressable";
import Spinner from "@/ui/components/Spinner";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useRef, useState } from "react";
import { Modal, Platform, StyleSheet, Text, View } from "react-native";

export type ConfirmAction = {
  label: string;
  onPress?: () => void;
  tone: "muted" | "danger" | "primary";
};

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  actions: ConfirmAction[];
  onRequestClose: () => void;
  loading?: boolean;
};

export default function ConfirmModal({
  visible,
  title,
  description,
  actions,
  onRequestClose,
  loading = false,
}: ConfirmModalProps) {
  const backdrop = useBackdropClose(onRequestClose);
  const [showSpinner, setShowSpinner] = useState(false);
  const buttonRowRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !visible) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const row = buttonRowRef.current as unknown as HTMLElement | null;
      row?.querySelector<HTMLElement>("[tabindex]")?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      previous?.focus?.();
    };
  }, [visible]);

  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 300);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay} {...backdrop.overlayProps}>
        <View style={styles.card} {...backdrop.cardProps}>
          <Text style={[styles.title, !description && styles.titleOnly]}>
            {title}
          </Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
          <View ref={buttonRowRef} style={styles.buttonRow}>
            {actions.map((action, index) => (
              <MotionPressable
                key={action.label}
                style={[styles.button, toneStyles[action.tone]]}
                onPress={action.onPress}
                disabled={loading}
              >
                {showSpinner && index === actions.length - 1 ? (
                  <Spinner size={16} strokeWidth={2} color={colors.white} />
                ) : (
                  <Text
                    style={
                      action.tone === "muted"
                        ? styles.buttonTextDark
                        : styles.buttonTextLight
                    }
                  >
                    {action.label}
                  </Text>
                )}
              </MotionPressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const toneStyles = StyleSheet.create({
  muted: {
    ...surfaces.muted,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  primary: {
    ...surfaces.primary,
  },
});

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
  titleOnly: {
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
  buttonTextDark: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  buttonTextLight: {
    ...textStyles.h7,
    color: colors.white,
  },
});
