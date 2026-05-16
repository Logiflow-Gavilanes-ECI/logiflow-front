import { Component } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';

interface LoginResponse {
  accessToken: string;
  role: string;
}

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false,
})
export class LoginPage {
  email = '';
  password = '';
  isSubmitting = false;
  formError: string | null = null;
  networkError: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async signInWithCredentials(): Promise<void> {
    if (this.isSubmitting) return;
    if (!this.email.trim() || !this.password) {
      this.formError = 'Email and password are required.';
      return;
    }

    this.isSubmitting = true;
    this.formError = null;
    this.networkError = null;

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
          email: this.email.trim(),
          password: this.password,
        }),
      );

      this.authService.setToken(response.accessToken);

      if (response.role === 'admin') {
        await this.router.navigate(['/home']);
      } else {
        this.authService.logout();
        this.formError = 'Access denied: this panel is for dispatchers only.';
      }
    } catch (error) {
      const err = error as HttpErrorResponse;
      if (err.status === 401 || err.status === 403) {
        this.formError = 'Invalid credentials. Please try again.';
      } else {
        this.networkError = 'Cannot reach the server. Check your connection.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  signInWithGoogle(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.formError = null;
    this.networkError = null;
    globalThis.location.assign(`${environment.apiUrl}/auth/google?app=admin`);
  }

  dismissNetworkError(): void {
    this.networkError = null;
  }
}
