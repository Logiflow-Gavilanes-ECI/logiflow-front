import { Injectable } from '@angular/core';
import { AuthTokenService, AUTH_TOKEN_KEY } from '@logiflow/shared-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenService = new AuthTokenService(localStorage, AUTH_TOKEN_KEY);

  setToken(token: string): void {
    this.tokenService.setToken(token);
  }

  getToken(): string | null {
    return this.tokenService.getToken();
  }

  getRole(): string | null {
    const claims = this.tokenService.decodeClaims();
    return (claims?.['role'] as string) ?? null;
  }

  getUserId(): string | null {
    const claims = this.tokenService.decodeClaims();
    return (claims?.['userId'] as string) ?? claims?.sub ?? null;
  }

  isAuthenticated(): boolean {
    return this.tokenService.hasToken() && !this.tokenService.isExpired();
  }

  getEmail(): string | null {
    const claims = this.tokenService.decodeClaims();
    return (claims?.['email'] as string) ?? null;
  }

  getName(): string | null {
    const claims = this.tokenService.decodeClaims();
    return (claims?.['name'] as string) ?? null;
  }

  logout(): void {
    this.tokenService.clearToken();
  }
}
