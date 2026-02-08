/**
 * AuthManager.js
 * Client-side authentication state management
 */

import { decodeJwt, isTokenExpired } from './jwt-decode.js';

const ACCESS_TOKEN_KEY = 'chess_access_token';
const REFRESH_TOKEN_KEY = 'chess_refresh_token';

export class AuthManager {
  constructor(apiBaseUrl = '/api') {
    this.apiBaseUrl = apiBaseUrl;
    this._refreshPromise = null;
  }

  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated() {
    const token = this.getAccessToken();
    if (!token) return false;

    if (isTokenExpired(token)) {
      const refreshToken = this.getRefreshToken();
      return refreshToken && !isTokenExpired(refreshToken);
    }

    return true;
  }

  getCurrentUser() {
    const token = this.getAccessToken();
    if (!token) return null;

    const decoded = decodeJwt(token);
    if (!decoded) return null;

    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      student_id: decoded.student_id
    };
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isStudent() {
    const user = this.getCurrentUser();
    return user?.role === 'student';
  }

  async login(username, password) {
    const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }

    this.setTokens(data.data.access_token, data.data.refresh_token);
    return data.data.user;
  }

  async refreshAccessToken() {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = this._doRefresh();

    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  async _doRefresh() {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken || isTokenExpired(refreshToken)) {
      this.clearTokens();
      return false;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        this.clearTokens();
        return false;
      }

      this.setTokens(data.data.access_token, data.data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  logout() {
    this.clearTokens();
    window.location.reload();
  }
}

export const authManager = new AuthManager();
