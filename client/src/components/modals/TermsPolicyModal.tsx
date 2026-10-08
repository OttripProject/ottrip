import type { TermsKey } from "@/constants/terms";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { Modal, StyleSheet, Text, View } from "react-native";

import RightArrowIcon from "../../../assets/right_arrow.svg";
import XIcon from "../../../assets/x.svg";

const TERMS_OPTIONS: { key: TermsKey; label: string }[] = [
  { key: "tos", label: "[필수] 서비스 이용 약관" },
  { key: "privacy", label: "[필수] 개인정보 수집 및 이용" },
  { key: "marketing", label: "[선택] 이벤트·혜택 정보 수신 및 활용 동의" },
];

type TermsPolicyModalProps = {
  visible: boolean;
  onClose: () => void;
  onPickTerm: (key: TermsKey) => void;
};

export default function TermsPolicyModal({
  visible,
  onClose,
  onPickTerm,
}: TermsPolicyModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>약관 및 정책</Text>
            <MotionPressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
              accessibilityLabel="닫기"
            >
              <MotionIcon>
                <XIcon width={16} height={16} color={colors.gray900} />
              </MotionIcon>
            </MotionPressable>
          </View>

          <View style={styles.options}>
            {TERMS_OPTIONS.map(opt => (
              <MotionPressable
                key={opt.key}
                style={styles.option}
                hoverStyle={shadows.xsHover}
                onPress={() => onPickTerm(opt.key)}
                accessibilityRole="button"
              >
                <Text style={styles.optionLabel} numberOfLines={2}>
                  {opt.label}
                </Text>
                <MotionIcon>
                  <RightArrowIcon
                    width={8}
                    height={14}
                    color={colors.gray600}
                  />
                </MotionIcon>
              </MotionPressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    ...surfaces.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lgPlus,
  },
  card: {
    width: 420 + spacing.xl * 2,
    maxWidth: "100%",
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: {
    ...textStyles.h5,
    color: colors.gray900,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...surfaces.outline,
  },
  optionLabel: {
    ...textStyles.body4,
    color: colors.gray900,
    flex: 1,
  },
});
