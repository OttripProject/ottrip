import { useHover } from "@/hooks/useHover";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type HoverPressableProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
};

export default function HoverPressable({
  style,
  hoverStyle,
  disabled,
  ...rest
}: HoverPressableProps) {
  const { hovered, pressableHoverProps } = useHover();
  return (
    <Pressable
      {...rest}
      {...pressableHoverProps}
      disabled={disabled}
      style={[style, hovered && !disabled && hoverStyle]}
    />
  );
}
