import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService, type UserRole } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

const DefaultRole: UserRole = 'conductor';

@Component({
  selector: 'logiflow-mobile-register-page',
  standalone: true,
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  fullName = '';
  email = '';
  password = '';
  role: UserRole = DefaultRole;
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
      const userRole = await this.authService.register({
        name: this.fullName.trim(),
        email: this.email.trim(),
        password: this.password,
        role: this.role,
      });

      await this.redirectByRole(userRole);
    } catch (error) {
      console.error('[mobile-auth] register failed', error);
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

    this.authService.logout();
    await this.router.navigate(['/register']);
  }
}
