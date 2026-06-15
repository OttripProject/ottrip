import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";

import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";

interface AiAnalyzeFailureModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export default function AiAnalyzeFailureModal({
  visible,
  message,
  onClose,
}: AiAnalyzeFailureModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(360, windowWidth - 48);
  const displayMessage = message.trim() || "분석에 실패했습니다.";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { width: cardWidth }]}
          onPress={e => e.stopPropagation?.()}
        >
          <Text style={styles.title}>첨부파일 분석 실패</Text>
          <Text style={styles.message}>{displayMessage}</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.confirmBtnText}>확인</Text>
          </Pressable>
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
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: "center",
  },
  title: {
    ...textStyles.h5,
    color: colors.black,
    textAlign: "center",
    width: "100%",
  },
  message: {
    ...textStyles.body4,
    color: colors.gray700,
    lineHeight: 22,
    textAlign: "center",
    width: "100%",
  },
  confirmBtn: {
    marginTop: spacing.sm,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.gray900,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  confirmBtnText: {
    ...textStyles.h8,
    color: colors.white,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
