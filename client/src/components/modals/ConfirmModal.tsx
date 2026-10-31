import { useBackdropClose } from "@/hooks/useBackdropClose";
import ActionButton from "@/ui/components/ActionButton";
import type { ActionButtonTone } from "@/ui/components/ActionButton.types";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useRef } from "react";
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
            {actions.map((action, index) => {
              const isLast = index === actions.length - 1;
              return (
                <ActionButton
                  key={action.label}
                  label={action.label}
                  tone={toneMap[action.tone]}
                  size="M"
                  fill
                  onPress={action.onPress}
                  loading={loading && isLast}
                  blocked={loading && !isLast}
                />
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const toneMap: Record<ConfirmAction["tone"], ActionButtonTone> = {
  muted: "secondary",
  danger: "destructive",
  primary: "primary",
};

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
    gap: spacing.md,
  },
});
