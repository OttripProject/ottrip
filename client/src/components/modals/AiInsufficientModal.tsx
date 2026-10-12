import ConfirmModal from "./ConfirmModal";

interface InsufficientScheduleModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function InsufficientScheduleModal({
  visible,
  onClose,
}: InsufficientScheduleModalProps) {
  return (
    <ConfirmModal
      visible={visible}
      title="일정이 부족해요"
      description={
        "여행 일정이 아직 충분하지 않아\nAI 체크리스트를 만들 수 없어요.\n일정을 조금 더 추가해 주세요."
      }
      actions={[{ label: "확인", tone: "dark", onPress: onClose }]}
      onRequestClose={onClose}
    />
  );
}
