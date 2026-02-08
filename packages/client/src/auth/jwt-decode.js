/**
 * jwt-decode.js
 * Lightweight JWT decoder (no verification - client-side only)
 */

export function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

const EXPIRY_BUFFER_SECONDS = 30;

export function isTokenExpired(token) {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < (now + EXPIRY_BUFFER_SECONDS);
}
