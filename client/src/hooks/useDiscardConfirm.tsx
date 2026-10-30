import ConfirmModal from "@/components/modals/ConfirmModal";
import { useState } from "react";

export function useDiscardConfirm(isDirty: boolean, onDiscard: () => void) {
  const [visible, setVisible] = useState(false);

  const requestClose = () => {
    if (isDirty) setVisible(true);
    else onDiscard();
  };

  const discardConfirmModal = (
    <ConfirmModal
      visible={visible}
      title="작성 중인 내용을 버릴까요?"
      actions={[
        { label: "계속 작성", tone: "muted", onPress: () => setVisible(false) },
        {
          label: "버리기",
          tone: "danger",
          onPress: () => {
            setVisible(false);
            onDiscard();
          },
        },
      ]}
      onRequestClose={() => setVisible(false)}
    />
  );

  return { requestClose, discardConfirmModal };
}
