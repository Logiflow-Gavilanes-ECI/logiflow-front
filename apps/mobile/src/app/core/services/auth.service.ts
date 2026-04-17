import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { AUTH_TOKEN_KEY, type JwtClaims } from '@logiflow/shared-auth';
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
	private tokenCache: string | null = null;
	private isTokenCacheHydrated = false;

	constructor(private readonly httpClient: HttpClient) {}

	async login(credentials: LoginRequest): Promise<string | null> {
		const response = await firstValueFrom(
			this.httpClient.post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, credentials),
		);
		const token = this.resolveToken(response);

		if (!token) {
			throw new Error('Authentication token is missing in login response.');
		}

		await this.persistToken(token);
		return this.resolveRole(response, token);
	}

	async register(payload: RegisterRequest): Promise<string | null> {
		const response = await firstValueFrom(
			this.httpClient.post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, payload),
		);
		const token = this.resolveToken(response);

		if (!token) {
			throw new Error('Authentication token is missing in login response.');
		}

		await this.persistToken(token);
		return this.resolveRole(response, token);
	}

	async getToken(): Promise<string | null> {
		await this.hydrateTokenCache();
		return this.tokenCache;
	}

	async getClaims(): Promise<JwtClaims | null> {
		const token = await this.getToken();
		return this.decodeClaimsFromToken(token);
	}

	async getRole(): Promise<string | null> {
		const claims = await this.getClaims();
		return (claims?.['role'] as string) ?? null;
	}

	async getUserId(): Promise<string | null> {
		const claims = await this.getClaims();
		return (claims?.['userId'] as string) ?? claims?.sub ?? null;
	}

	async setTokenFromOAuth(token: string): Promise<void> {
		await this.persistToken(token);
	}

	async logout(): Promise<void> {
		this.tokenCache = null;
		this.isTokenCacheHydrated = true;
		await Preferences.remove({ key: AUTH_TOKEN_KEY });
	}

	private async persistToken(token: string): Promise<void> {
		this.tokenCache = token;
		this.isTokenCacheHydrated = true;
		await Preferences.set({ key: AUTH_TOKEN_KEY, value: token });
	}

	private async hydrateTokenCache(): Promise<void> {
		if (this.isTokenCacheHydrated) {
			return;
		}

		const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
		this.tokenCache = value ?? null;
		this.isTokenCacheHydrated = true;
	}

	private decodeClaimsFromToken(token: string | null): JwtClaims | null {
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

	private resolveToken(response: AuthResponse): string | null {
		const token = response.access_token ?? response.accessToken ?? response.token;
		if (typeof token !== 'string' || token.trim().length === 0) {
			return null;
		}

		return token;
	}

	private resolveRole(response: AuthResponse, token: string): string | null {
		const role = response.role ?? response.user?.role;
		if (typeof role === 'string' && role.trim().length > 0) {
			return role;
		}

		const claims = this.decodeClaimsFromToken(token);
		return (claims?.['role'] as string) ?? null;
	}
}
