import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

function makeRoutSnapshot(role?: string): ActivatedRouteSnapshot {
  return { data: role ? { role } : {} } as unknown as ActivatedRouteSnapshot;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authMock = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getRole', 'logout']);
    routerMock = jasmine.createSpyObj('Router', ['createUrlTree']);
    routerMock.createUrlTree.and.callFake((commands: any[]) => commands as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('unauthenticated user', () => {
    beforeEach(() => {
      authMock.isAuthenticated.and.returnValue(false);
    });

    it('redirects to /login', () => {
      const result = guard.canActivate(makeRoutSnapshot());
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
      expect(result).not.toBeTrue();
    });

    it('does not check role when not authenticated', () => {
      guard.canActivate(makeRoutSnapshot('admin'));
      expect(authMock.getRole).not.toHaveBeenCalled();
    });
  });

  describe('authenticated user with correct role', () => {
    beforeEach(() => {
      authMock.isAuthenticated.and.returnValue(true);
      authMock.getRole.and.returnValue('admin');
    });

    it('allows access when role matches', () => {
      expect(guard.canActivate(makeRoutSnapshot('admin'))).toBeTrue();
    });

    it('allows access when no role is required', () => {
      expect(guard.canActivate(makeRoutSnapshot())).toBeTrue();
    });

    it('does not call logout when access is granted', () => {
      guard.canActivate(makeRoutSnapshot('admin'));
      expect(authMock.logout).not.toHaveBeenCalled();
    });
  });

  describe('authenticated user with wrong role', () => {
    beforeEach(() => {
      authMock.isAuthenticated.and.returnValue(true);
      authMock.getRole.and.returnValue('conductor');
    });

    it('blocks access when role does not match', () => {
      const result = guard.canActivate(makeRoutSnapshot('admin'));
      expect(result).not.toBeTrue();
    });

    it('calls logout when role does not match', () => {
      guard.canActivate(makeRoutSnapshot('admin'));
      expect(authMock.logout).toHaveBeenCalled();
    });

    it('redirects to /login when role does not match', () => {
      guard.canActivate(makeRoutSnapshot('admin'));
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
    });
  });
});
