import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import CheckedIcon from "../../assets/mobile_plan_checked.svg";
import InfoCircleIcon from "../../assets/info_circle.svg";
import XIcon from "../../assets/mobile_close.svg";

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  message: string;
  action?: ToastAction;
  icon?: "check" | "info";
}

interface ToastContextType {
  showToast: (message: string, options?: { action?: ToastAction; icon?: "check" | "info" }) => void;
  hideToast: () => void;
  toastMessage: string | null;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const ToastStateContext = createContext<ToastState | null>(null);

export const ToastUI = () => {
  const base = useToast();
  const toast = useContext(ToastStateContext);

  if (!toast) return null;

  return (
    <Pressable style={styles.toastContainer} onPress={() => {}}>
      <View style={styles.toastIconBg}>
        {toast.icon === "info" ? (
          <InfoCircleIcon width="20" height="20" color={colors.white} />
        ) : (
          <CheckedIcon width="20" height="20" />
        )}
      </View>
      <Text style={styles.toastText}>{toast.message}</Text>
      {toast.action && (
        <Pressable
          style={styles.actionBtn}
          onPress={() => {
            base.hideToast();
            toast.action!.onPress();
          }}
        >
          <Text style={styles.actionBtnText}>{toast.action.label}</Text>
        </Pressable>
      )}
      <Pressable style={styles.toastCloseBtn} hitSlop={12} onPress={base.hideToast}>
        <XIcon width="14" height="14" color={colors.white} />
      </Pressable>
    </Pressable>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, options?: { action?: ToastAction; icon?: "check" | "info" }) => {
      setToast({ message, action: options?.action, icon: options?.icon });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 3000);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toastMessage: toast?.message ?? null }}>
      <ToastStateContext.Provider value={toast}>
        {children}
        <ToastUI />
      </ToastStateContext.Provider>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
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
  actionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginLeft: 8,
    flexShrink: 0,
  },
  actionBtnText: {
    ...textStyles.h7,
    color: colors.primary,
  },
  toastCloseBtn: {
    marginLeft: 2,
    opacity: 0.55,
    justifyContent: "center",
    alignItems: "center",
  },
});
