import ConfirmModal from "@/components/modals/ConfirmModal";
import { getJosa } from "@/utils/koreanUtils";

interface TripDeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  tripName: string;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  confirmTone?: "danger" | "primary";
}

export default function TripDeleteConfirmModal({
  visible,
  onClose,
  tripName,
  onConfirm,
  title,
  description,
  confirmLabel = "삭제",
  confirmTone = "danger",
}: TripDeleteConfirmModalProps) {
  const resolvedTitle = title ?? "정말 이 여행을 삭제하시겠어요?";
  const resolvedDescription =
    description ??
    `"${tripName}"${getJosa(tripName, "delete")} 삭제하면\n이 여행에 속한 모든 일정, 항공편,\n숙소 및 비용 데이터가 영구적으로 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`;

  return (
    <ConfirmModal
      visible={visible}
      title={resolvedTitle}
      description={resolvedDescription}
      actions={[
        { label: "취소", tone: "muted", onPress: onClose },
        { label: confirmLabel, tone: confirmTone, onPress: onConfirm },
      ]}
      onRequestClose={onClose}
    />
  );
}
