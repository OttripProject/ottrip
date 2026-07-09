import { colors } from "@/ui/tokens/colors";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";

if (
  Platform.OS === "web" &&
  typeof document !== "undefined" &&
  !document.getElementById("spinner-keyframes")
) {
  const style = document.createElement("style");
  style.id = "spinner-keyframes";
  style.textContent =
    "@keyframes spinner-rotate { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}

export default function Spinner({
  size = 42,
  strokeWidth = 3,
  color = colors.aiInk,
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "web") return;
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotation]);

  if (Platform.OS === "web") {
    return (
      <View
        style={
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: `${color}33`,
            borderTopColor: color,
            animationName: "spinner-rotate",
            animationDuration: "1s",
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          } as any
        }
      />
    );
  }

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: `${color}33`,
        borderTopColor: color,
        transform: [{ rotate: spin }],
      }}
    />
  );
}
