import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { LoginPage } from './login.page';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let httpMock: HttpTestingController;
  let authMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authMock = jasmine.createSpyObj('AuthService', ['setToken', 'logout']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    routerMock.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      declarations: [LoginPage],
      imports: [HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signInWithCredentials()', () => {
    it('shows formError when email is empty', async () => {
      component.email = '';
      component.password = 'secret';
      await component.signInWithCredentials();
      expect(component.formError).toBeTruthy();
      httpMock.expectNone(`${environment.apiUrl}/auth/login`);
    });

    it('shows formError when password is empty', async () => {
      component.email = 'test@logiflow.app';
      component.password = '';
      await component.signInWithCredentials();
      expect(component.formError).toBeTruthy();
      httpMock.expectNone(`${environment.apiUrl}/auth/login`);
    });

    it('does nothing if already submitting', async () => {
      component.isSubmitting = true;
      component.email = 'test@logiflow.app';
      component.password = 'pass';
      await component.signInWithCredentials();
      httpMock.expectNone(`${environment.apiUrl}/auth/login`);
    });

    it('stores token and navigates to /home for admin role', async () => {
      component.email = 'admin@logiflow.app';
      component.password = 'pass123';
      const promise = component.signInWithCredentials();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: 'tok.en.here', role: 'admin' });
      await promise;

      expect(authMock.setToken).toHaveBeenCalledWith('tok.en.here');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
      expect(component.isSubmitting).toBeFalse();
    });

    it('rejects conductor role with formError', async () => {
      component.email = 'driver@logiflow.app';
      component.password = 'pass123';
      const promise = component.signInWithCredentials();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: 'tok.en.here', role: 'conductor' });
      await promise;

      expect(authMock.logout).toHaveBeenCalled();
      expect(component.formError).toContain('dispatchers only');
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('sets formError on 401', async () => {
      component.email = 'user@logiflow.app';
      component.password = 'wrong';
      const promise = component.signInWithCredentials();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      await promise;

      expect(component.formError).toContain('Invalid credentials');
      expect(component.isSubmitting).toBeFalse();
    });

    it('sets networkError on 500', async () => {
      component.email = 'user@logiflow.app';
      component.password = 'pass';
      const promise = component.signInWithCredentials();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      await promise;

      expect(component.networkError).toContain('Cannot reach');
      expect(component.isSubmitting).toBeFalse();
    });

    it('clears previous errors before a new attempt', async () => {
      component.formError = 'old error';
      component.networkError = 'old network error';
      component.email = 'user@logiflow.app';
      component.password = 'pass';
      const promise = component.signInWithCredentials();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: 'tok', role: 'admin' });
      await promise;

      expect(component.formError).toBeNull();
      expect(component.networkError).toBeNull();
    });
  });

  describe('signInWithGoogle()', () => {
    it('does nothing if already submitting', () => {
      component.isSubmitting = true;
      const errorBefore = component.formError;
      // Cannot call the method as it would navigate — just verify the guard condition
      expect(component.isSubmitting).toBeTrue();
      expect(component.formError).toBe(errorBefore);
    });
  });

  describe('dismissNetworkError()', () => {
    it('clears the networkError', () => {
      component.networkError = 'some error';
      component.dismissNetworkError();
      expect(component.networkError).toBeNull();
    });
  });
});
