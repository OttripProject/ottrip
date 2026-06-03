import { type RefObject, useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

const useDetectClose = <T>(
  elem: RefObject<T>,
  initialState = false,
): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void,
  () => void,
] => {
  const [isOpen, setIsOpen] = useState(initialState);

  const handleOutsidePress = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const onClick = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          elem.current !== null &&
          !(elem.current as any).contains?.(target)
        ) {
          setIsOpen(false);
        }
      };

      const timeoutId = setTimeout(() => {
        window.addEventListener("click", onClick, true);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener("click", onClick, true);
      };
    }
  }, [isOpen, elem]);

  return [isOpen, setIsOpen, handleOutsidePress];
};

export default useDetectClose;
