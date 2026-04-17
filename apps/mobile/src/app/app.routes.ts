import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
import { RegisterPage } from './register/register.page';
import { RoutePage } from './route/route.page';

export const appRoutes: Routes = [
  {
    path: 'login',
    component: LoginPage,
  },
  {
    path: 'route',
    component: RoutePage,
  },
  {
    path: 'register',
    component: RegisterPage,
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
