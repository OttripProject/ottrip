import { motion } from "@/ui/tokens/motion";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

const isWeb = Platform.OS === "web";

if (
  isWeb &&
  typeof document !== "undefined" &&
  !document.getElementById("motion-keyframes")
) {
  const style = document.createElement("style");
  style.id = "motion-keyframes";
  style.textContent =
    "@keyframes fmWiggle { 0%, 100% { rotate: 0deg; } 25% { rotate: -10deg; } 60% { rotate: 8deg; } 85% { rotate: -3deg; } } " +
    "@keyframes fmJelly { 0% { scale: 1; } 30% { scale: 1.06 0.94; } 55% { scale: 0.97 1.03; } 75% { scale: 1.02 0.98; } 100% { scale: 1; } }";
  document.head.appendChild(style);
}

const HoverContext = createContext(false);

type MotionPressableProps = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  pressFeedback?: "jelly";
  children?: ReactNode;
};

export default function MotionPressable({
  style,
  hoverStyle,
  pressedStyle,
  pressFeedback,
  disabled,
  onPress,
  onHoverIn,
  onHoverOut,
  children,
  ...rest
}: MotionPressableProps) {
  const [hovered, setHovered] = useState(false);
  const [jelly, setJelly] = useState(false);
  const jellyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = isWeb && hovered && !disabled;

  useEffect(() => {
    return () => {
      if (jellyTimerRef.current) clearTimeout(jellyTimerRef.current);
    };
  }, []);

  const playJelly = () => {
    if (jellyTimerRef.current) clearTimeout(jellyTimerRef.current);
    setJelly(false);
    requestAnimationFrame(() => setJelly(true));
    jellyTimerRef.current = setTimeout(
      () => setJelly(false),
      motion.duration.jelly,
    );
  };

  return (
    <HoverContext.Provider value={active}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPress={e => {
          if (isWeb && pressFeedback === "jelly") playJelly();
          onPress?.(e);
        }}
        onHoverIn={e => {
          setHovered(true);
          onHoverIn?.(e);
        }}
        onHoverOut={e => {
          setHovered(false);
          onHoverOut?.(e);
        }}
        style={({ pressed }) => [
          style,
          isWeb && webStyles.transition,
          active && hoverStyle,
          active && !pressed && webStyles.hovered,
          isWeb && pressed && !disabled && [webStyles.pressed, pressedStyle],
          jelly && webStyles.jelly,
        ]}
      >
        {children}
      </Pressable>
    </HoverContext.Provider>
  );
}

export function MotionIcon({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const hovered = useContext(HoverContext);
  return <View style={[style, hovered && webStyles.wiggle]}>{children}</View>;
}

const { easing, duration } = motion;

const webStyles = {
  transition: {
    transitionProperty: "transform, box-shadow, background-color, opacity",
    transitionDuration: `${duration.slow}ms, ${duration.base}ms, ${duration.fast}ms, ${duration.fast}ms`,
    transitionTimingFunction: `${easing.spring}, ${easing.ease}, ease, ease`,
  } as ViewStyle,
  hovered: {
    transform: [{ translateY: -1 }],
  } as ViewStyle,
  pressed: {
    transform: [{ scale: 0.96 }],
    transitionDuration: `${duration.press}ms`,
  } as ViewStyle,
  jelly: {
    animationName: "fmJelly",
    animationDuration: `${duration.jelly}ms`,
    animationTimingFunction: easing.ease,
  } as ViewStyle,
  wiggle: {
    animationName: "fmWiggle",
    animationDuration: `${duration.wiggle}ms`,
    animationTimingFunction: easing.ease,
  } as ViewStyle,
};
