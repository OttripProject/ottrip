import ConfirmModal from "@/components/modals/ConfirmModal";
import { useEffect, useState } from "react";

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

  if (isCompleted) {
    return (
      <ConfirmModal
        visible={visible}
        title="계정이 삭제되었어요."
        actions={[{ label: "확인", tone: "dark", onPress: handleDone }]}
        onRequestClose={handleRequestClose}
      />
    );
  }

  return (
    <ConfirmModal
      visible={visible}
      title="정말 계정을 삭제하시겠어요?"
      description={
        "계정을 삭제하면 지금까지 만든 여행 일정이\n모두 사라지며, 다시 복구할 수 없어요."
      }
      actions={[
        { label: "취소", tone: "muted", onPress: onClose },
        { label: "삭제", tone: "danger", onPress: handleConfirm },
      ]}
      onRequestClose={handleRequestClose}
      disabled={isDeleting}
    />
  );
}
