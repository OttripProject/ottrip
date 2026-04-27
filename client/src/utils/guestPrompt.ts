/**
 * 게스트 차단(403 GUEST_NOT_ALLOWED)을 만났을 때 띄울 전역 모달의
 * 작은 외부 스토어. axios 인터셉터를 쓰지 않고, **사용자 액션 호출부의 catch**에서
 * `handleGuestPromptError(err)`를 호출하는 방식으로 사용한다.
 */

type Listener = (visible: boolean) => void;
type BeforeSignUpNavListener = () => void;

let visible = false;
const listeners = new Set<Listener>();
const beforeSignUpNavListeners = new Set<BeforeSignUpNavListener>();

export const guestPrompt = {
  show(): void {
    if (visible) return;
    visible = true;
    listeners.forEach(l => l(true));
  },
  hide(): void {
    if (!visible) return;
    visible = false;
    listeners.forEach(l => l(false));
  },
  isVisible(): boolean {
    return visible;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /**
   * `GuestPromptModal`에서 "회원가입" 누르기 직전 호출.
   * 풀스크린 모달(여행 정보 등)을 먼저 닫지 않으면 그 위에 `소셜회원가입`이 가려짐.
   */
  registerBeforeSignUpNavigation(
    fn: BeforeSignUpNavListener,
  ): () => void {
    beforeSignUpNavListeners.add(fn);
    return () => {
      beforeSignUpNavListeners.delete(fn);
    };
  },
  notifyBeforeSignUpNavigation(): void {
    beforeSignUpNavListeners.forEach(fn => {
      try {
        fn();
      } catch {
        /* noop */
      }
    });
  },
};

/**
 * 호출부 catch에서 사용. 403 + detail.code === "GUEST_NOT_ALLOWED" 이면 모달을
 * 띄우고 true 를 반환한다. 호출부는 true 일 때 자체 에러 알림을 생략하면 된다.
 */
export function handleGuestPromptError(error: unknown): boolean {
  const anyErr = error as { response?: { status?: number; data?: unknown } };
  if (anyErr?.response?.status !== 403) return false;
  const data = anyErr.response.data as { detail?: unknown } | undefined;
  const detail = data?.detail;
  const code =
    typeof detail === "object" && detail !== null
      ? (detail as { code?: string }).code
      : undefined;
  if (code !== "GUEST_NOT_ALLOWED") return false;
  guestPrompt.show();
  return true;
}
