import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private registered = false;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  async initialize(): Promise<void> {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        console.warn('[push] Permission not granted');
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token) => {
        console.log('[push] FCM token:', token.value);
        await this.registerTokenWithBackend(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[push] Registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[push] Notification received:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[push] Action performed:', action);
      });
    } catch (error) {
      console.warn('[push] Push notifications not available (web environment):', error);
    }
  }

  private async registerTokenWithBackend(fcmToken: string): Promise<void> {
    if (this.registered) return;

    const token = await this.authService.getToken();
    if (!token) return;

    try {
      await firstValueFrom(
        this.http.post(
          `${environment.apiBaseUrl}/notifications/register-device`,
          { token: fcmToken, platform: this.detectPlatform() },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      this.registered = true;
      console.log('[push] Device registered with backend');
    } catch (error) {
      console.error('[push] Failed to register device:', error);
    }
  }

  private detectPlatform(): string {
    const userAgent = globalThis.navigator?.userAgent?.toLowerCase() ?? '';
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    return 'web';
  }
}
