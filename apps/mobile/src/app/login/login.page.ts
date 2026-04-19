import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

type LoginField = 'email' | 'password';

@Component({
  selector: 'logiflow-mobile-login-page',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  email = '';
  password = '';
  isSubmitting = false;
  isSubmitted = false;
  formError: string | null = null;
  networkErrorMessage: string | null = null;
  fieldErrors: Partial<Record<LoginField, string>> = {};

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async onSubmit(form: NgForm): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitted = true;
    this.clearValidationErrors();

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const role = await this.authService.login({
        email: this.email.trim(),
        password: this.password,
      });

      await this.redirectByRole(role);
    } catch (error) {
      this.handleSubmitError(error);
      console.error('[mobile-auth] login failed', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.clearValidationErrors();

    try {
      const apiUrl = environment.apiBaseUrl;
      const redirectUrl = `${apiUrl}/auth/google?app=mobile`;
      globalThis.location.assign(redirectUrl);
    } catch (error) {
      this.handleSubmitError(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  dismissNetworkError(): void {
    this.networkErrorMessage = null;
  }

  onFieldChanged(field: LoginField): void {
    delete this.fieldErrors[field];
    if (this.formError) {
      this.formError = null;
    }
  }

  showControlError(control: NgModel, errorKey: string): boolean {
    return Boolean(control.errors?.[errorKey] && (control.touched || this.isSubmitted));
  }

  private async redirectByRole(role: string | null): Promise<void> {
    if (role === 'conductor') {
      await this.router.navigate(['/route']);
      return;
    }

    if (role === 'admin') {
      globalThis.location.assign(environment.adminAppUrl);
      return;
    }

    await this.authService.logout();
    await this.router.navigate(['/login']);
  }

  private clearValidationErrors(): void {
    this.formError = null;
    this.networkErrorMessage = null;
    this.fieldErrors = {};
  }

  private handleSubmitError(error: unknown): void {
    if (this.isNetworkError(error)) {
      this.networkErrorMessage = 'Unable to reach the server. Check your connection and try again.';
      this.formError = null;
      this.fieldErrors = {};
      return;
    }

    this.applyBackendValidationErrors(error);
  }

  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
  }

  private applyBackendValidationErrors(error: unknown): void {
    this.formError = 'Unable to sign in right now.';

    if (!(error instanceof HttpErrorResponse)) {
      return;
    }

    if (error.status === 401) {
      this.formError = 'Invalid email or password.';
      return;
    }

    const messageList = this.extractErrorMessages(error.error);
    for (const message of messageList) {
      const normalized = message.toLowerCase();
      if (normalized.includes('email') && !this.fieldErrors.email) {
        this.fieldErrors.email = message;
        continue;
      }

      if (normalized.includes('password') && !this.fieldErrors.password) {
        this.fieldErrors.password = message;
        continue;
      }

      if (!this.formError || this.formError === 'Unable to sign in right now.') {
        this.formError = message;
      }
    }

    const objectErrors = this.extractObjectErrors(error.error);
    if (typeof objectErrors.email === 'string') {
      this.fieldErrors.email = objectErrors.email;
    }

    if (typeof objectErrors.password === 'string') {
      this.fieldErrors.password = objectErrors.password;
    }

    if (typeof objectErrors.form === 'string' && objectErrors.form.trim().length > 0) {
      this.formError = objectErrors.form;
    }
  }

  private extractErrorMessages(payload: unknown): string[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const rawMessage = (payload as { message?: unknown }).message;
    if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
      return [rawMessage];
    }

    if (Array.isArray(rawMessage)) {
      return rawMessage
        .filter((message): message is string => typeof message === 'string')
        .map((message) => message.trim())
        .filter((message) => message.length > 0);
    }

    return [];
  }

  private extractObjectErrors(payload: unknown): Record<string, string> {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const errors = (payload as { errors?: unknown }).errors;
    if (!errors || typeof errors !== 'object') {
      return {};
    }

    const normalizedErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries(errors)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        normalizedErrors[key] = value;
        continue;
      }

      if (Array.isArray(value)) {
        const firstString = value.find((item) => typeof item === 'string');
        if (typeof firstString === 'string' && firstString.trim().length > 0) {
          normalizedErrors[key] = firstString;
        }
      }
    }

    return normalizedErrors;
  }
}