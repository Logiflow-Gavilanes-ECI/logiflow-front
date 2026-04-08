import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
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
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
