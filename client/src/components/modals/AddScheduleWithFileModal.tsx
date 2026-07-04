import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import XIcon from "../../../assets/x.svg";
import UploadIcon from "../../../assets/upload_tray.svg";
import AiRefreshIcon from "../../../assets/ai_refresh.svg";

interface AddScheduleWithFileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddScheduleWithFileModal({ visible, onClose }: AddScheduleWithFileModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.container}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>파일로 일정 추가</Text>
              <Text style={styles.description}>
                엑셀·이미지·PDF를 올리면 AI가 일정을 정리해 드려요.
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <XIcon width={16} height={16} />
            </Pressable>
          </View>

          <View style={styles.dropZone}>
            <View style={styles.uploadIconCircle}>
              <UploadIcon width={26} height={26} />
            </View>
            <Text style={styles.dropZoneTitle}>
              파일을 끌어다 놓거나 클릭해서 선택
            </Text>
            <Text style={styles.dropZoneHint}>
              엑셀(xlsx·csv) · 이미지(JPG·PNG) · PDF · 최대 10MB · 1개만 첨부
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <View style={styles.aiButton}>
              <LinearGradient
                colors={colors.aiGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiButtonGradient}
              >
                <AiRefreshIcon width={14} height={14} color={colors.white} />
                <Text style={styles.aiButtonText}>AI로 분석</Text>
              </LinearGradient>
            </View>
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
  container: {
    width: "100%",
    maxWidth: 530,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: 18,
    boxShadow: "rgba(0, 0, 0, 0.12) 0px 24px 48px",
  } as any,
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  title: {
    ...textStyles.h4,
    color: colors.gray900,
  },
  description: {
    ...textStyles.body4,
    color: colors.gray700,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.gray400,
    borderRadius: radii.lg,
    backgroundColor: colors.gray100,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  dropZoneTitle: {
    ...textStyles.h6,
    color: colors.gray900,
  },
  dropZoneHint: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radii.md + 2,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cancelButtonText: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  aiButton: {
    flex: 1,
    height: 46,
    borderRadius: radii.md + 2,
    overflow: "hidden",
    opacity: 0.45,
  },
  aiButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  aiButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});
