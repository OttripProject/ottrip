import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { getJosa } from "@/utils/koreanUtils";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface TripDeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  tripName: string;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  confirmButtonColor?: string;
}

export default function TripDeleteConfirmModal({
  visible,
  onClose,
  tripName,
  onConfirm,
  title,
  description,
  confirmLabel = "삭제",
  confirmButtonColor = "#ff4242",
}: TripDeleteConfirmModalProps) {
  const resolvedTitle = title ?? "정말 이 여행을 삭제하시겠어요?";
  const resolvedDescription =
    description ??
    `"${tripName}"${getJosa(tripName, "delete")} 삭제하면\n이 여행에 속한 모든 일정, 항공편,\n숙소 및 비용 데이터가 영구적으로 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.deleteModalOverlay}>
        <View style={styles.deleteModalCard}>
          <Text style={styles.deleteModalTitle}>{resolvedTitle}</Text>
          <Text style={styles.deleteModalText}>{resolvedDescription}</Text>
          <View style={styles.deleteModalButtons}>
            <Pressable style={styles.deleteModalCancelButton} onPress={onClose}>
              <Text style={styles.deleteModalCancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.deleteModalDeleteButton, { backgroundColor: confirmButtonColor }]}
              onPress={onConfirm}
            >
              <Text style={styles.deleteModalDeleteButtonText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalCard: {
    width: 320,
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.12,
    shadowRadius: 48,
    elevation: 12,
  },
  deleteModalTitle: {
    ...textStyles.h6,
    textAlign: "center",
    marginBottom: 0,
  },
  deleteModalText: {
    ...textStyles.body5,
    color: colors.gray600,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  deleteModalButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
  },
  deleteModalCancelButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray200,
  },
  deleteModalCancelButtonText: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  deleteModalDeleteButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff4242",
  },
  deleteModalDeleteButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});
