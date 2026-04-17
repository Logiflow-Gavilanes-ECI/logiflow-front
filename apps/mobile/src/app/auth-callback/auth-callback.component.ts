import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'logiflow-auth-callback',
  standalone: true,
  template: `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--lf-bg-deep);color:var(--lf-text-muted);font-family:'Space Mono',monospace;font-size:12px;">
      Authenticating...
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const accessToken = params.get('accessToken');
    const role = params.get('role');

    if (!accessToken) {
      await this.router.navigate(['/login']);
      return;
    }

    await this.authService.setTokenFromOAuth(accessToken);

    if (role === 'conductor') {
      await this.router.navigate(['/route']);
    } else if (role === 'admin') {
      globalThis.location.assign(environment.adminAppUrl);
    } else {
      await this.router.navigate(['/route']);
    }
  }
}
