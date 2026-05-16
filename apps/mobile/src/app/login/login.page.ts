import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { Browser } from '@capacitor/browser';

interface LoginResponse {
  accessToken: string;
  role: string;
}

@Component({
  selector: 'logiflow-mobile-login-page',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [CommonModule, FormsModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  email = '';
  password = '';
  isSubmitting = false;
  formError: string | null = null;
  networkErrorMessage: string | null = null;

  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  async signInWithCredentials(): Promise<void> {
    if (this.isSubmitting) return;
    if (!this.email.trim() || !this.password) {
      this.formError = 'Email and password are required.';
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.formError = null;
    this.networkErrorMessage = null;
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, {
          email: this.email.trim(),
          password: this.password,
        }),
      );

      await this.authService.setTokenFromOAuth(response.accessToken);

      if (response.role === 'conductor') {
        await this.router.navigate(['/route'], { replaceUrl: true });
      } else if (response.role === 'admin') {
        this.formError = 'This app is for drivers only. Use the web panel.';
        await this.authService.logout();
      } else {
        this.formError = 'Unrecognized role. Contact your administrator.';
        await this.authService.logout();
      }
    } catch (error) {
      const err = error as HttpErrorResponse;
      if (err.status === 401 || err.status === 403) {
        this.formError = 'Invalid credentials. Please try again.';
      } else {
        this.networkErrorMessage = 'Cannot reach the server. Check your connection.';
      }
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.formError = null;
    this.networkErrorMessage = null;
    this.cdr.markForCheck();
    await Browser.open({ url: `${environment.apiBaseUrl}/auth/google?app=mobile` });
  }

  dismissNetworkError(): void {
    this.networkErrorMessage = null;
    this.cdr.markForCheck();
  }
}
