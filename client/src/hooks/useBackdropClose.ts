import { useRef } from "react";
import { Platform, type ViewProps } from "react-native";

type PointerLikeEvent = { stopPropagation: () => void };

export function useBackdropClose(onClose?: () => void) {
  const insideCard = useRef(false);
  const downOutside = useRef(false);
  const upOutside = useRef(false);

  if (Platform.OS !== "web") return { overlayProps: {}, cardProps: {} };

  const markInside = () => {
    insideCard.current = true;
  };

  return {
    overlayProps: {
      onPointerDown: (e: PointerLikeEvent) => {
        e.stopPropagation();
        downOutside.current = !insideCard.current;
        insideCard.current = false;
      },
      onPointerUp: (e: PointerLikeEvent) => {
        e.stopPropagation();
        upOutside.current = !insideCard.current;
        insideCard.current = false;
      },
      onClick: (e: PointerLikeEvent) => {
        e.stopPropagation();
        if (downOutside.current && upOutside.current) onClose?.();
        downOutside.current = false;
        upOutside.current = false;
      },
    } as ViewProps,
    cardProps: {
      onPointerDown: markInside,
      onPointerUp: markInside,
    } as ViewProps,
  };
}
