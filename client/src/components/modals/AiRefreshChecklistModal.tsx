import ConfirmModal from "./ConfirmModal";

interface RefreshChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RefreshChecklistModal({
  visible,
  onClose,
  onConfirm,
}: RefreshChecklistModalProps) {
  return (
    <ConfirmModal
      visible={visible}
      title="계속 진행할까요?"
      description="추천 체크리스트가 추가됩니다."
      actions={[
        { label: "취소", tone: "muted", onPress: onClose },
        { label: "확인", tone: "dark", onPress: onConfirm },
      ]}
      onRequestClose={onClose}
    />
  );
}
