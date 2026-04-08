import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

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
      console.error('[mobile-auth] login failed', error);
    } finally {
      this.isSubmitting = false;
    }
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
}
