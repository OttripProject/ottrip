import { Alert, Platform } from "react-native";

const GENERIC_ERROR_MESSAGE =
  "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
const KOREAN_RE = /[가-힣]/;

/**
 * 서버 에러 응답에서 사용자에게 보여줄 메시지를 뽑는다.
 * detail이 한글 문자열이면(서버가 사용자용으로 작성한 메시지) 그대로 쓰고,
 * 그 외(영문 프레임워크 기본값·객체·네트워크 에러 등)는 소프트한 공용 문구로 대체한다.
 */
export function toUserMessage(
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE,
): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;
  if (typeof detail === "string" && KOREAN_RE.test(detail)) {
    return detail;
  }
  return fallback;
}

/** RN Web에서 `Alert.alert`가 동작하지 않는 경우가 있어 웹은 `window` 사용 */
export function showMessage(title: string, message: string): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export function showDestructiveConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  labels: { cancel: string; confirm: string } = {
    cancel: "취소",
    confirm: "삭제",
  },
): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: labels.cancel, style: "cancel" },
    { text: labels.confirm, style: "destructive", onPress: onConfirm },
  ]);
}

/**
 * 첨부 업로드 실패 시 사용자에게 보여줄 본문.
 * - R2 직접 PUT 실패 등은 `Error.message`
 * - API 4xx/5xx는 axios `response.data.detail` (문자열)
 */
export function formatAttachmentUploadFailureMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    const m = error.message.trim();
    if (m && !/^Request failed with status code \d+$/i.test(m)) {
      return `${fallback}\n\n${m}`;
    }
  }
  const err = error as {
    response?: { data?: { detail?: unknown } };
    message?: string;
  };
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return `${fallback}\n\n${detail.trim()}`;
  }
  return fallback;
}

export function showPickFileType(
  title: string,
  message: string,
  onPickImage: () => void,
  onPickDocument: () => void,
): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    showMessage(
      title,
      `${message}\n\n웹에서는 onAppendPendingFiles 연결 후 파일 선택창을 사용해 주세요.`,
    );
    return;
  }
  Alert.alert(title, message, [
    { text: "사진", onPress: onPickImage },
    { text: "문서 선택", onPress: onPickDocument },
    { text: "취소", style: "cancel" },
  ]);
}
