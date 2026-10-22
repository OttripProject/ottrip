import { usePressScale } from "@/ui/effects/pressScale";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ScalePressableProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
};

export default function ScalePressable({
  style,
  onPressIn,
  onPressOut,
  ...rest
}: ScalePressableProps) {
  const { scale, onPressIn: scaleIn, onPressOut: scaleOut } = usePressScale();

  return (
    <AnimatedPressable
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={e => {
        scaleIn();
        onPressIn?.(e);
      }}
      onPressOut={e => {
        scaleOut();
        onPressOut?.(e);
      }}
    />
  );
}
