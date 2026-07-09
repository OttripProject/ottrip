import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { useState } from "react";
import type React from "react";
import ReactDOM from "react-dom";
import { Platform, StyleSheet, View } from "react-native";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = (e: any) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleMouseLeave = () => setPos(null);

  const tooltip =
    pos && Platform.OS === "web"
      ? ReactDOM.createPortal(
          <div
            style={{
              position: "fixed",
              left: pos.x,
              top: pos.y - 8,
              transform: "translate(-50%, -100%)",
              backgroundColor: colors.white,
              color: colors.gray900,
              fontFamily: textStyles.h9.fontFamily,
              fontSize: textStyles.h9.fontSize,
              lineHeight: `${textStyles.h9.lineHeight}px`,
              borderRadius: 6,
              padding: "4px 8px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 99999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            {text}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: `5px solid ${colors.white}`,
              }}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <View
      style={styles.container}
      {...({
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      } as any)}
    >
      {children}
      {tooltip}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
});
