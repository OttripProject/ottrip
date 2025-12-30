
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

export function isTokenExpiringSoon(token: string, bufferMinutes: number = 5): boolean {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) return true; 
  
  const expiresAt = decoded.exp * 1000; 
  const now = Date.now();
  const bufferMs = bufferMinutes * 60 * 1000;
  
  return expiresAt - now < bufferMs; 
}

export function getTokenExpiresIn(token: string): number {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) return 0;
  
  const expiresAt = decoded.exp * 1000;
  const now = Date.now();
  const remaining = expiresAt - now;
  
  return remaining > 0 ? remaining : 0;
}

