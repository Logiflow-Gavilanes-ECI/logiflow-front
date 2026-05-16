import { ChangeDetectionStrategy, Component, NgZone, OnInit } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { filter, firstValueFrom, take } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private lastHandledDeepLinkUrl: string | null = null;

  constructor(
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    void App.addListener('appUrlOpen', ({ url }) => {
      void this.handleDeepLink(url);
    });

    void App.getLaunchUrl().then((result) => {
      if (result?.url) {
        void this.handleDeepLink(result.url);
      }
    });
  }

  private async handleDeepLink(url: string): Promise<void> {
    const token = this.getOAuthTokenFromDeepLink(url);
    const isDuplicate = this.lastHandledDeepLinkUrl === url;
    if (!token || isDuplicate) {
      return;
    }

    this.lastHandledDeepLinkUrl = url;
    await this.waitForInitialNavigation();
    await Browser.close().catch(() => undefined);

    await this.authService.setTokenFromOAuth(token);
    const role = await this.authService.getRole();

    if (role === 'admin') {
      globalThis.location.assign(environment.adminAppUrl);
      return;
    }

    const navigated = await this.zone.run(() => this.router.navigateByUrl('/route', { replaceUrl: true }));

    if (!navigated) {
      console.warn('[mobile] OAuth route navigation was ignored');
    }
  }

  private getOAuthTokenFromDeepLink(url: string): string | null {
    try {
      const parsed = new URL(url);
      const token = this.getTokenFromUrlParams(parsed);
      const isLogiFlowScheme = parsed.protocol.toLowerCase() === 'logiflow:';
      const isCallback =
        parsed.hostname.toLowerCase() === 'callback' ||
        parsed.pathname.replace(/^\/+/, '').toLowerCase() === 'callback';

      if (isLogiFlowScheme && isCallback && token) {
        return token;
      }
    } catch {
      return this.getTokenFromRawUrl(url);
    }

    return null;
  }

  private getTokenFromUrlParams(url: URL): string | null {
    const queryToken = url.searchParams.get('token') ?? url.searchParams.get('accessToken');
    if (queryToken) {
      return queryToken;
    }

    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    if (!hash) {
      return null;
    }

    const hashParams = new URLSearchParams(hash);
    return hashParams.get('token') ?? hashParams.get('accessToken');
  }

  private getTokenFromRawUrl(url: string): string | null {
    const tokenMatch = /[?#&](?:token|accessToken)=([^&#]+)/.exec(url);
    if (!tokenMatch?.[1]) {
      return null;
    }

    return decodeURIComponent(tokenMatch[1].replace(/\+/g, ' '));
  }

  private async waitForInitialNavigation(): Promise<void> {
    if (this.router.navigated) {
      return;
    }

    await firstValueFrom(
      this.router.events.pipe(
        filter(
          (event) =>
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
        take(1),
      ),
    ).then(() => undefined);
  }
}
