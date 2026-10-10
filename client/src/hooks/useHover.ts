import { useState } from "react";

export function useHover() {
  const [hovered, setHovered] = useState(false);
  const enter = () => setHovered(true);
  const leave = () => setHovered(false);
  return {
    hovered,
    pressableHoverProps: { onHoverIn: enter, onHoverOut: leave },
    viewHoverProps: { onPointerEnter: enter, onPointerLeave: leave },
  };
}
