import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import CheckedIcon from "../../assets/mobile_plan_checked.svg"
import XIcon from "../../assets/mobile_close.svg"

interface ToastContextType {
  showToast: (message: string) => void;
  hideToast: () => void; // 💡 추가: 닫기 함수
  toastMessage: string | null; // 💡 추가: 메시지 상태
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// 💡 1. Provider 안에 있던 UI 부분을 'ToastUI'라는 컴포넌트로 분리합니다.
export const ToastUI = () => {
  const { toastMessage, hideToast } = useToast();

  if (!toastMessage) return null;

  return (
    <View style={styles.toastContainer}>
      <View style={styles.toastIconBg}>
        <CheckedIcon width="20" height="20" />
      </View>
      <Text style={styles.toastText}>{toastMessage}</Text>
      <Pressable
        style={styles.toastCloseBtn}
        hitSlop={12}
        onPress={hideToast} // 💡 수정: context에서 가져온 hideToast 사용
      >
        <XIcon width="14" height="14" color={colors.white}/>
      </Pressable>
    </View>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  return (
    // 💡 2. Provider에 상태와 닫기 함수도 같이 넘겨줍니다.
    <ToastContext.Provider value={{ showToast, hideToast, toastMessage }}>
      {children}
      
      {/* 💡 3. 기본 화면용 토스트 렌더링 (분리한 ToastUI 사용) */}
      <ToastUI />
    </ToastContext.Provider>
  );
};

// styles 부분은 작성하신 것과 100% 동일하게 유지
const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    bottom: 40,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 360,
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "rgba(0, 0, 0, 0.28)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 10,
    zIndex: 9999,
  },
  toastIconBg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  toastText: {
    ...textStyles.h7,
    flex: 1,
    color: colors.white,
  },
  toastCloseBtn: {
    marginLeft: 2,
    opacity: 0.55,
    justifyContent: "center",
    alignItems: "center",
  },
});