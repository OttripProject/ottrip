import { useState, useCallback, useRef } from 'react';
import { authApi } from '@/services/auth';

interface NicknameValidationResult {
  isValid: boolean;
  error?: string;
}

export const useNicknameValidation = (currentNickname?: string) => {
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const checkNicknameTimer = useRef<NodeJS.Timeout | null>(null);

  // 닉네임 형식 검증
  const validateNickname = useCallback((nickname: string): NicknameValidationResult => {
    const trimmed = nickname.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: '닉네임을 입력해주세요.' };
    }
    const pattern = /^(?:[가-힣0-9_.-]{1,10}|[A-Za-z0-9_.-]{1,20})$/;
    if (!pattern.test(trimmed)) {
      return { 
        isValid: false, 
        error: '닉네임은 한글 1~10자 또는 영문 1~20자이며, 특수문자는 \'_\', \'-\', \'.\'만 허용합니다.' 
      };
    }
    return { isValid: true };
  }, []);

  // 닉네임 중복 검사 (디바운싱)
  const triggerNicknameCheck = useCallback((nickname: string) => {
    if (checkNicknameTimer.current) clearTimeout(checkNicknameTimer.current);
    checkNicknameTimer.current = setTimeout(async () => {
      setCheckingNickname(true);
      try {
        const res = await authApi.validateNickname(nickname);
        setNicknameError(res.error);
      } catch (e: any) {
        setNicknameError('중복 확인 실패. 잠시 후 다시 시도해주세요.');
      } finally {
        setCheckingNickname(false);
      }
    }, 500);
  }, []);

  // 닉네임 변경 핸들러
  const onNicknameChange = useCallback((text: string) => {
    const validation = validateNickname(text);
    if (validation.isValid) {
      setNicknameError(null);
      // 현재 닉네임과 다를 때만 중복 검사
      if (text !== currentNickname) {
        triggerNicknameCheck(text);
      }
    } else {
      setNicknameError(validation.error || null);
    }
  }, [validateNickname, triggerNicknameCheck, currentNickname]);

  // 검증 상태 초기화
  const resetValidation = useCallback(() => {
    setNicknameError(null);
    setCheckingNickname(false);
    if (checkNicknameTimer.current) {
      clearTimeout(checkNicknameTimer.current);
      checkNicknameTimer.current = null;
    }
  }, []);

  // 검증 통과 여부
  const isValid = !nicknameError && !checkingNickname;

  return {
    nicknameError,
    checkingNickname,
    onNicknameChange,
    resetValidation,
    isValid,
    validateNickname,
  };
};
