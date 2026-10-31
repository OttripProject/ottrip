import ConfirmModal from "@/components/modals/ConfirmModal";

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isGuest?: boolean;
  onSignUp?: () => void;
}

export default function LogoutModal({
  visible,
  onClose,
  onConfirm,
  isGuest = false,
  onSignUp,
}: LogoutModalProps) {
  return (
    <ConfirmModal
      visible={visible}
      title="정말로 로그아웃 하시겠어요?"
      description={
        isGuest
          ? "현재 게스트로 사용중입니다.\n로그아웃 시 모든 데이터가 삭제됩니다.\n그래도 로그아웃 하시겠습니까?"
          : "다시 로그인 하려면 계정 인증이 필요합니다."
      }
      actions={
        isGuest
          ? [
              { label: "로그아웃", tone: "muted", onPress: onConfirm },
              { label: "회원가입", tone: "primary", onPress: onSignUp },
            ]
          : [
              { label: "취소", tone: "muted", onPress: onClose },
              { label: "로그아웃", tone: "danger", onPress: onConfirm },
            ]
      }
      onRequestClose={onClose}
    />
  );
}
