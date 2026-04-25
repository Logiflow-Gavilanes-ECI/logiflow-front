import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AUTH_TOKEN_KEY, type JwtClaims } from '@logiflow/shared-auth';

export type UserRole = 'admin' | 'conductor';

@Injectable({ providedIn: 'root' })
export class AuthService {
	private tokenCache: string | null = null;
	private isTokenCacheHydrated = false;

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
}
