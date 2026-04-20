import { Component } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false,
})
export class LoginPage {
  isSubmitting = false;
  formError: string | null = null;
  networkError: string | null = null;

  signInWithGoogle(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.formError = null;
    this.networkError = null;

    const apiUrl = environment.apiUrl;
    globalThis.location.assign(`${apiUrl}/auth/google?app=admin`);
  }

  dismissNetworkError(): void {
    this.networkError = null;
  }
}
