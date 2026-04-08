import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthTokenService, AUTH_TOKEN_KEY } from '@logiflow/shared-auth';
import { environment } from '../../../environments/environment';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token?: string;
  accessToken?: string;
  token?: string;
  role?: string;
  user?: {
    role?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly httpClient: HttpClient) {}

  private readonly tokenService = new AuthTokenService(localStorage, AUTH_TOKEN_KEY);

  async login(credentials: LoginRequest): Promise<string | null> {
    const response = await firstValueFrom(
      this.httpClient.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials),
    );
    const token = this.resolveToken(response);

    if (!token) {
      throw new Error('Authentication token is missing in login response.');
    }

    this.setToken(token);
    return this.resolveRole(response);
  }

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

  logout(): void {
    this.tokenService.clearToken();
  }

  private resolveToken(response: LoginResponse): string | null {
    const token = response.access_token ?? response.accessToken ?? response.token;
    if (typeof token !== 'string' || token.trim().length === 0) {
      return null;
    }

    return token;
  }

  private resolveRole(response: LoginResponse): string | null {
    const role = response.role ?? response.user?.role;
    if (typeof role === 'string' && role.trim().length > 0) {
      return role;
    }

    return this.getRole();
  }
}
