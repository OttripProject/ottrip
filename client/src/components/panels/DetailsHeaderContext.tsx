import { createContext, useContext, useLayoutEffect, useRef } from "react";

export type DetailsHeader = {
  title: string;
  showTabs: boolean;
  onClose: () => void;
};

export const DetailsHeaderContext = createContext<
  ((header: DetailsHeader | null) => void) | null
>(null);

export function useDetailsHeader({ title, showTabs, onClose }: DetailsHeader) {
  const setHeader = useContext(DetailsHeaderContext);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    setHeader?.({ title, showTabs, onClose: () => onCloseRef.current() });
  }, [setHeader, title, showTabs]);

  useLayoutEffect(() => () => setHeader?.(null), [setHeader]);
}
