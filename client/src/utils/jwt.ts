/**
 * JWT 토큰 관련 유틸리티 함수
 */

/**
 * JWT 토큰을 디코딩합니다.
 * @param token JWT 토큰 문자열
 * @returns 디코딩된 페이로드 또는 null
 */
export function decodeJWT(token: string): { exp?: number; [key: string]: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 2 ? '==' : base64.length % 4 === 3 ? '=' : '';
    const decoded = atob(base64 + pad);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * 토큰이 곧 만료될지 확인합니다.
 * @param token JWT 토큰 문자열
 * @param bufferMinutes 만료 전 버퍼 시간 (분 단위, 기본값: 5분)
 * @returns 만료 임박 여부
 */
export function isTokenExpiringSoon(token: string, bufferMinutes: number = 5): boolean {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) return true; // exp가 없으면 만료된 것으로 간주
  
  const expiresAt = decoded.exp * 1000; // exp는 초 단위이므로 밀리초로 변환
  const now = Date.now();
  const bufferMs = bufferMinutes * 60 * 1000;
  
  return expiresAt - now < bufferMs; // 만료까지 남은 시간이 buffer보다 작으면 true
}

/**
 * 토큰의 만료 시간까지 남은 시간을 반환합니다 (밀리초).
 * @param token JWT 토큰 문자열
 * @returns 만료까지 남은 시간 (밀리초), 만료되었거나 exp가 없으면 0
 */
export function getTokenExpiresIn(token: string): number {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) return 0;
  
  const expiresAt = decoded.exp * 1000;
  const now = Date.now();
  const remaining = expiresAt - now;
  
  return remaining > 0 ? remaining : 0;
}

