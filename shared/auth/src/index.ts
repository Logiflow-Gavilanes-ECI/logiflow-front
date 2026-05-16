export interface TokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface JwtClaims {
  sub?: string;
  exp?: number;
  iat?: number;
  role?: string;
  [key: string]: unknown;
}

export const AUTH_TOKEN_KEY = 'logiflow.auth.token';

export class AuthTokenService {
  constructor(private readonly storage: TokenStorage, private readonly tokenKey = AUTH_TOKEN_KEY) {}

  setToken(token: string): void {
    this.storage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return this.storage.getItem(this.tokenKey);
  }

  clearToken(): void {
    this.storage.removeItem(this.tokenKey);
  }

  hasToken(): boolean {
    return Boolean(this.getToken());
  }

  decodeClaims(): JwtClaims | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(payload);
      return JSON.parse(decoded) as JwtClaims;
    } catch {
      return null;
    }
  }

  isExpired(nowEpochSeconds = Math.floor(Date.now() / 1000)): boolean {
    const claims = this.decodeClaims();
    if (!claims?.exp) {
      return false;
    }
    return claims.exp <= nowEpochSeconds;
  }
}
