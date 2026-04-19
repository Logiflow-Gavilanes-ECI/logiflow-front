import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { environment } from '../../environments/environment';

@Component({
  selector: 'logiflow-mobile-login-page',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [CommonModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  isSubmitting = false;
  formError: string | null = null;
  networkErrorMessage: string | null = null;

  signInWithGoogle(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.formError = null;
    this.networkErrorMessage = null;

    globalThis.location.assign(`${environment.apiBaseUrl}/auth/google`);
  }

  dismissNetworkError(): void {
    this.networkErrorMessage = null;
  }
}
