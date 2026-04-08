import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgForm, NgModel } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

type LoginField = 'email' | 'password';

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
  isSubmitted = false;
  formError: string | null = null;
  networkError: string | null = null;
  fieldErrors: Partial<Record<LoginField, string>> = {};

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async onSubmit(form: NgForm): Promise<void> {
    if (this.isSubmitting) return;

    this.isSubmitted = true;
    this.clearErrors();

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
      this.handleError(error);
      console.error('[auth] login failed', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  showControlError(control: NgModel, errorKey: string): boolean {
    return Boolean(control.errors?.[errorKey] && (control.touched || this.isSubmitted));
  }

  onFieldChanged(field: LoginField): void {
    delete this.fieldErrors[field];
    if (this.formError) this.formError = null;
  }

  dismissNetworkError(): void {
    this.networkError = null;
  }
  private async redirectByRole(role: string | null): Promise<void> {
    if (role === 'admin') {
      await this.router.navigate(['/home']);
      return;
    }

    if (role === 'conductor') {
      this.authService.logout();
      globalThis.location.assign(environment.driverAppUrl);
      return;
    }

    this.authService.logout();
    await this.router.navigate(['/login']);
  }

  private clearErrors(): void {
    this.formError = null;
    this.networkError = null;
    this.fieldErrors = {};
  }

  private handleError(error: unknown): void {
    if (this.isNetworkError(error)) {
      this.networkError = 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.';
      return;
    }

    this.applyBackendErrors(error);
  }

  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
  }

  private applyBackendErrors(error: unknown): void {
    this.formError = 'No se pudo iniciar sesión.';

    if (!(error instanceof HttpErrorResponse)) return;

    if (error.status === 401) {
      this.formError = 'Correo o contraseña incorrectos.';
      return;
    }

    const messages = this.extractMessages(error.error);
    for (const message of messages) {
      const normalized = message.toLowerCase();
      if (normalized.includes('email') && !this.fieldErrors.email) {
        this.fieldErrors.email = message;
        continue;
      }
      if (normalized.includes('password') && !this.fieldErrors.password) {
        this.fieldErrors.password = message;
        continue;
      }
      if (!this.formError || this.formError === 'No se pudo iniciar sesión.') {
        this.formError = message;
      }
    }
  }

  private extractMessages(payload: unknown): string[] {
    if (!payload || typeof payload !== 'object') return [];

    const raw = (payload as { message?: unknown }).message;
    if (typeof raw === 'string' && raw.trim().length > 0) return [raw];

    if (Array.isArray(raw)) {
      return raw
        .filter((m): m is string => typeof m === 'string')
        .map((m) => m.trim())
        .filter((m) => m.length > 0);
    }

    return [];
  }
}
