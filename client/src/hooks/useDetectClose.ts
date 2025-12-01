import { useEffect, useState, RefObject, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * 외부 클릭 감지 Hook (React Native용)
 * 
 * @param elem - 감지할 요소의 ref
 * @param initialState - 초기 열림 상태
 * @returns [isOpen, setIsOpen, handleOutsidePress] - 열림 상태, 상태 변경 함수, 외부 클릭 핸들러
 */
const useDetectClose = <T extends any>(
  elem: RefObject<T>,
  initialState: boolean = false
): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void,
  () => void
] => {
  const [isOpen, setIsOpen] = useState(initialState);

  // 외부 클릭 핸들러
  const handleOutsidePress = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // 웹 환경: 전역 클릭 이벤트 리스너
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onClick = (e: MouseEvent) => {
        const target = e.target as Node;
        if (elem.current !== null && !(elem.current as any).contains?.(target)) {
          setIsOpen(false);
        }
      };

      // 약간의 지연을 두어 현재 클릭 이벤트가 처리된 후에 리스너 추가
      const timeoutId = setTimeout(() => {
        window.addEventListener('click', onClick, true);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('click', onClick, true);
      };
    }

    // React Native 환경에서는 handleOutsidePress를 Modal의 onRequestClose나
    // Pressable 오버레이의 onPress에서 사용
  }, [isOpen, elem]);

  return [isOpen, setIsOpen, handleOutsidePress];
};

export default useDetectClose;

