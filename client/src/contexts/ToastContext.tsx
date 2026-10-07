import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, type TextStyle, View, type ViewStyle } from "react-native";
import BodyPortal from "@/ui/components/BodyPortal";
import { colors } from "@/ui/tokens/colors";
import { motion } from "@/ui/tokens/motion";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { zIndex } from "@/ui/tokens/zIndex";
import CheckWhiteIcon from "../../assets/check_white.svg";
import CheckedIcon from "../../assets/mobile_plan_checked.svg";
import InfoCircleIcon from "../../assets/info_circle.svg";
import XIcon from "../../assets/mobile_close.svg";

const isWeb = Platform.OS === "web";

if (isWeb && typeof document !== "undefined" && !document.getElementById("toast-keyframes")) {
  const style = document.createElement("style");
  style.id = "toast-keyframes";
  style.textContent =
    "@keyframes ottripToastInR { 0% { opacity: 0; transform: translateX(24px); } 100% { opacity: 1; transform: translateX(0); } } " +
    "@keyframes ottripToastOutR { 0% { opacity: 1; } 100% { opacity: 0; transform: translateX(8px); } }";
  document.head.appendChild(style);
}

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  id: number;
  message: string;
  action?: ToastAction;
  icon?: "check" | "info";
  closable: boolean;
  leaving: boolean;
}

interface ToastOptions {
  action?: ToastAction;
  icon?: "check" | "info";
  duration?: number;
  closable?: boolean;
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
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
    <Pressable
      key={toast.id}
      style={[
        styles.toastContainer,
        isWeb && webStyles.toastContainer,
        isWeb && (toast.leaving ? webStyles.toastOut : webStyles.toastIn),
      ]}
      onPress={() => {}}
    >
      <View style={[styles.toastIconBg, isWeb && toast.icon !== "info" && webStyles.toastCheckBg]}>
        {toast.icon === "info" ? (
          <InfoCircleIcon width="20" height="20" color={colors.white} />
        ) : isWeb ? (
          <CheckWhiteIcon width="11" height="11" />
        ) : (
          <CheckedIcon width="20" height="20" />
        )}
      </View>
      <Text style={[styles.toastText, isWeb && webStyles.toastText]}>{toast.message}</Text>
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
      {toast.closable && (
        <Pressable style={styles.toastCloseBtn} hitSlop={12} onPress={base.hideToast}>
          <XIcon width="14" height="14" color={colors.white} />
        </Pressable>
      )}
    </Pressable>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef(0);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (!isWeb) {
      setToast(null);
      return;
    }
    setToast(prev => (prev ? { ...prev, leaving: true } : prev));
    toastTimerRef.current = setTimeout(() => setToast(null), motion.duration.toastOut);
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      toastIdRef.current += 1;
      setToast({
        id: toastIdRef.current,
        message,
        action: options?.action,
        icon: options?.icon,
        closable: options?.closable ?? true,
        leaving: false,
      });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(hideToast, options?.duration ?? 3000);
    },
    [hideToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toastMessage: toast?.message ?? null }}>
      <ToastStateContext.Provider value={toast}>
        {children}
        <BodyPortal>
          <ToastUI />
        </BodyPortal>
      </ToastStateContext.Provider>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    cursor: "auto",
    position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
    bottom: 40,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 360,
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

const webStyles = {
  toastContainer: {
    backgroundColor: colors.gray900,
    borderRadius: radii.lgPlus,
    padding: spacing.lg,
    minWidth: 288,
    maxWidth: 420,
    zIndex: zIndex.webModal + 1,
  } as ViewStyle,
  toastIn: {
    animationName: "ottripToastInR",
    animationDuration: `${motion.duration.toastIn}ms`,
    animationTimingFunction: motion.easing.ease,
    animationFillMode: "forwards",
  } as ViewStyle,
  toastOut: {
    animationName: "ottripToastOutR",
    animationDuration: `${motion.duration.toastOut}ms`,
    animationTimingFunction: "ease",
    animationFillMode: "forwards",
  } as ViewStyle,
  toastCheckBg: {
    backgroundColor: colors.toastCheck,
    borderRadius: radii.pill,
  } as ViewStyle,
  toastText: {
    ...textStyles.body4,
    color: colors.white,
  } as TextStyle,
};
