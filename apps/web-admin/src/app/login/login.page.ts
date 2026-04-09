import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
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

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async onSubmit(): Promise<void> {
    if (this.isSubmitting) {
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
      console.error('[auth] login failed', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private async redirectByRole(role: string | null): Promise<void> {
    if (role === 'admin') {
      await this.router.navigate(['/home']);
      return;
    }

    if (role === 'conductor') {
      globalThis.location.assign(environment.driverAppUrl);
      return;
    }

    this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
