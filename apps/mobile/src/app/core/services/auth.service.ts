import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthTokenService, AUTH_TOKEN_KEY, type JwtClaims } from '@logiflow/shared-auth';
import { environment } from '../../../environments/environment';

interface LoginRequest {
	email: string;
	password: string;
}

export type UserRole = 'admin' | 'conductor';

interface RegisterRequest {
	name: string;
	email: string;
	password: string;
	role: UserRole;
}

interface AuthResponse {
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
	private readonly tokenService = new AuthTokenService(localStorage, AUTH_TOKEN_KEY);

	constructor(private readonly httpClient: HttpClient) {}

	async login(credentials: LoginRequest): Promise<string | null> {
		const response = await firstValueFrom(
			this.httpClient.post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, credentials),
		);
		const token = this.resolveToken(response);

		if (!token) {
			throw new Error('Authentication token is missing in login response.');
		}

		this.tokenService.setToken(token);
		return this.resolveRole(response);
	}

	async register(payload: RegisterRequest): Promise<string | null> {
		const response = await firstValueFrom(
			this.httpClient.post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, payload),
		);
		const token = this.resolveToken(response);

		if (!token) {
			throw new Error('Authentication token is missing in login response.');
		}

		this.tokenService.setToken(token);
		return this.resolveRole(response);
	}

	getToken(): string | null {
		return this.tokenService.getToken();
	}

	getClaims(): JwtClaims | null {
		return this.tokenService.decodeClaims();
	}

	getRole(): string | null {
		const claims = this.getClaims();
		return (claims?.['role'] as string) ?? null;
	}

	getUserId(): string | null {
		const claims = this.getClaims();
		return (claims?.['userId'] as string) ?? claims?.sub ?? null;
	}

	logout(): void {
		this.tokenService.clearToken();
	}

	private resolveToken(response: AuthResponse): string | null {
		const token = response.access_token ?? response.accessToken ?? response.token;
		if (typeof token !== 'string' || token.trim().length === 0) {
			return null;
		}

		return token;
	}

	private resolveRole(response: AuthResponse): string | null {
		const role = response.role ?? response.user?.role;
		if (typeof role === 'string' && role.trim().length > 0) {
			return role;
		}

		return this.getRole();
	}
}
