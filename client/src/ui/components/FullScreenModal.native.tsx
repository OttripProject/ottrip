import GuestPromptModal from "@/components/modals/GuestPromptModal";
import { colors } from "@/ui/tokens/colors";
import { guestPrompt } from "@/utils/guestPrompt";
import { type ReactNode, useEffect } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FullScreenModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 상태바(시간, 배터리) 영역 배경색. 지정 시 iOS/Android 모두 적용 */
  containerBackgroundColor?: string;
}

export default function FullScreenModal({
  visible,
  onClose,
  children,
  containerBackgroundColor = colors.white,
}: FullScreenModalProps) {
  const insets = useSafeAreaInsets();

  /** 부모 모달이 닫히면 게스트 안내(전역)도 끄기 — 이중 RN Modal/상태 꼬임·터치 먹통 방지 */
  useEffect(() => {
    if (!visible) {
      guestPrompt.hide();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: containerBackgroundColor },
        ]}
      >
        {children}
        <GuestPromptModal presentation="overlay" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
