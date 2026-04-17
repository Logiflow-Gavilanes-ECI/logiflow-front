import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-auth-callback',
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

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const accessToken = params.get('accessToken');
    const role = params.get('role');

    if (!accessToken) {
      void this.router.navigate(['/login']);
      return;
    }

    this.authService.setToken(accessToken);

    if (role === 'admin') {
      void this.router.navigate(['/home']);
    } else if (role === 'conductor') {
      globalThis.location.assign(environment.driverAppUrl);
    } else {
      void this.router.navigate(['/home']);
    }
  }
}
