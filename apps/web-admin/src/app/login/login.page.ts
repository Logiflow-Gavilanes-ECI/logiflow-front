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

    globalThis.location.assign(`${environment.apiUrl}/auth/google`);
  }

  dismissNetworkError(): void {
    this.networkError = null;
  }
}
