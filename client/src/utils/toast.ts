import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  position?: 'top' | 'bottom';
  bottomOffset?: number;
}

/**
 * 공통 Toast 메시지 표시 함수
 */
export const showToast = (options: ToastOptions) => {
  const {
    type,
    title,
    message,
    duration = 3000,
    position = 'bottom',
    bottomOffset = 20,
  } = options;

  Toast.show({
    type,
    text1: title,
    text2: message,
    position,
    bottomOffset,
    visibilityTime: duration,
    autoHide: true,
  });
};

/**
 * 성공 Toast 메시지
 */
export const showSuccessToast = (title: string, message: string, duration?: number) => {
  showToast({
    type: 'success',
    title,
    message,
    duration,
  });
};

/**
 * 오류 Toast 메시지
 */
export const showErrorToast = (title: string, message: string, duration?: number) => {
  showToast({
    type: 'error',
    title,
    message,
    duration,
  });
};

/**
 * 정보 Toast 메시지
 */
export const showInfoToast = (title: string, message: string, duration?: number) => {
  showToast({
    type: 'info',
    title,
    message,
    duration,
  });
};

/**
 * 경고 Toast 메시지
 */
export const showWarningToast = (title: string, message: string, duration?: number) => {
  showToast({
    type: 'warning',
    title,
    message,
    duration,
  });
};

// 여행 관련 Toast 메시지들
export const tripToastMessages = {
  addSuccess: () => showSuccessToast('여행 추가 완료', '여행 계획이 성공적으로 추가되었습니다.'),
  addError: () => showErrorToast('추가 실패', '여행 계획 추가에 실패했습니다.'),
  addErrorGeneric: () => showErrorToast('추가 실패', '여행을 추가하는 중 오류가 발생했습니다.'),
  
  updateSuccess: () => showSuccessToast('여행 수정 완료', '여행 정보가 성공적으로 수정되었습니다.'),
  updateError: () => showErrorToast('수정 실패', '여행 정보 수정에 실패했습니다.'),
  
  deleteSuccess: () => showSuccessToast('여행 삭제 완료', '여행 계획이 성공적으로 삭제되었습니다.'),
  deleteError: () => showErrorToast('삭제 실패', '여행 계획 삭제에 실패했습니다.'),
};
