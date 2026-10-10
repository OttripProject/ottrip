import { useState } from "react";
import type { LayoutChangeEvent, TextStyle } from "react-native";

export function useWidthTextScale(fullWidth: number, minScale = 0.7) {
  const [width, setWidth] = useState(fullWidth);
  const scale = Math.min(1, Math.max(minScale, width / fullWidth));

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const scaled = (style: TextStyle) => ({
    fontSize: (style.fontSize ?? 0) * scale,
    lineHeight: (style.lineHeight ?? 0) * scale,
  });

  return { onLayout, scaled };
}
