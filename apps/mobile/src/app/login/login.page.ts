import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { environment } from '../../environments/environment';
import { Browser } from '@capacitor/browser';

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

  async signInWithGoogle(): Promise<void> {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.formError = null;
    this.networkErrorMessage = null;

    const apiUrl = environment.apiBaseUrl;
    // Open in external browser so the Angular WebView stays alive
    await Browser.open({ url: `${apiUrl}/auth/google?app=mobile` });
  }

  dismissNetworkError(): void {
    this.networkErrorMessage = null;
  }
}
