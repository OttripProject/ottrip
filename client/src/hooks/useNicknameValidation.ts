import { useState, useCallback, useRef, useEffect } from 'react';
import { authApi } from '@/services/auth';

interface NicknameValidationResult {
  isValid: boolean;
  error?: string;
}

export const useNicknameValidation = (currentNickname?: string) => {
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const checkNicknameTimer = useRef<NodeJS.Timeout | null>(null);

  const validateNickname = useCallback((nickname: string): NicknameValidationResult => {
    const trimmed = nickname.trim();
    if (trimmed.length === 0) {
      return { isValid: false };
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

  const onNicknameChange = useCallback((text: string) => {
    const validation = validateNickname(text);
    if (validation.isValid) {
      setNicknameError(null);
      if (text !== currentNickname) {
        triggerNicknameCheck(text);
      }
    } else {
      setNicknameError(validation.error || null);
    }
  }, [validateNickname, triggerNicknameCheck, currentNickname]);

  const resetValidation = useCallback(() => {
    setNicknameError(null);
    setCheckingNickname(false);
    if (checkNicknameTimer.current) {
      clearTimeout(checkNicknameTimer.current);
      checkNicknameTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (checkNicknameTimer.current) {
        clearTimeout(checkNicknameTimer.current);
        checkNicknameTimer.current = null;
      }
    };
  }, []);

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
