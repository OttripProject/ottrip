import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { guestPrompt } from "@/utils/guestPrompt";

const overlayStyle: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.7)",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const cardStyle: ViewStyle = {
  backgroundColor: colors.white,
  borderRadius: 24,
  width: 320,
  paddingHorizontal: 24,
  paddingVertical: 24,
};

type GuestPromptPresentation = "modal" | "overlay";

type GuestPromptModalProps = {
  /**
   * `modal` — 루트(일반 화면)용 RN Modal.
   * `overlay` — FullScreenModal 등 다른 RN Modal 안: Modal 중첩 방지(absolute View).
   */
  presentation?: GuestPromptPresentation;
};

/**
 * 게스트가 회원 전용 기능에 접근했을 때: 전역 `guestPrompt` store로 표시.
 * - RootNavigator: `presentation="modal"` (기본)
 * - FullScreenModal: `presentation="overlay"`
 */
export default function GuestPromptModal({
  presentation = "modal",
}: GuestPromptModalProps) {
  const [visible, setVisible] = useState<boolean>(guestPrompt.isVisible());
  const navigation = useNavigation<any>();

  useEffect(() => {
    return guestPrompt.subscribe(setVisible);
  }, []);

  const onClose = () => {
    guestPrompt.hide();
  };

  const onSignUp = () => {
    /** 풀스크린(여행정보 등) 먼저 닫기 → 뒤에 스택 `소셜회원가입`이 보이게 */
    guestPrompt.notifyBeforeSignUpNavigation();
    guestPrompt.hide();
    /** 모달 unmount 커밋 후 이동 (같은 틱에 navigate 하면 이전 RN Modal이 위에 남을 수 있음) */
    queueMicrotask(() => {
      navigation.navigate(
        "소셜회원가입" as never,
        { guestUpgrade: true } as never,
      );
    });
  };

  if (!visible) {
    return null;
  }

  const body = (
    <View style={overlayStyle} pointerEvents="auto">
      <View style={cardStyle} pointerEvents="auto">
        <Text style={styles.title}>회원 전용 기능이에요</Text>
        <Text style={styles.body}>
          게스트로는 사용할 수 없는 기능입니다.{"\n"}
          로그인 후 이용해 주세요.
        </Text>
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.buttonGray,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.buttonTextDark}>닫기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.buttonPrimary,
              pressed && styles.pressed,
            ]}
            onPress={onSignUp}
          >
            <Text style={styles.buttonTextLight}>로그인</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (presentation === "overlay") {
    /** 풀스크린 RN `Modal` 안: 동일 `View` 오버레이는 z-index로도 안 뜨는 기기가 있어 자식 `Modal`로 쌓는다(부모 닫을 땐 guestPrompt.hide) */
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        {body}
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    ...textStyles.h5,
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    ...textStyles.body4,
    color: colors.gray600,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  button: {
    width: 132,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonGray: {
    backgroundColor: colors.gray300,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonTextDark: {
    ...textStyles.h7,
    color: colors.black,
  },
  buttonTextLight: {
    ...textStyles.h7,
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
