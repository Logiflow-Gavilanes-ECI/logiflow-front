import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AUTH_TOKEN_KEY } from '@logiflow/shared-auth';

function makeJwt(claims: object, expOffsetSeconds = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expOffsetSeconds;
  const payload = btoa(JSON.stringify({ ...claims, exp }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.fakesignature`;
}

function makeExpiredJwt(claims: object): string {
  return makeJwt(claims, -60);
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setToken / getToken', () => {
    it('returns null when no token is stored', () => {
      expect(service.getToken()).toBeNull();
    });

    it('stores and retrieves a token', () => {
      const token = makeJwt({ role: 'admin' });
      service.setToken(token);
      expect(service.getToken()).toBe(token);
    });

    it('persists token under the correct localStorage key', () => {
      const token = makeJwt({ role: 'admin' });
      service.setToken(token);
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(token);
    });
  });

  describe('logout', () => {
    it('removes the token from storage', () => {
      service.setToken(makeJwt({ role: 'admin' }));
      service.logout();
      expect(service.getToken()).toBeNull();
    });
  });

  describe('getRole', () => {
    it('returns null when no token is stored', () => {
      expect(service.getRole()).toBeNull();
    });

    it('returns admin role from JWT payload', () => {
      service.setToken(makeJwt({ role: 'admin' }));
      expect(service.getRole()).toBe('admin');
    });

    it('returns conductor role from JWT payload', () => {
      service.setToken(makeJwt({ role: 'conductor' }));
      expect(service.getRole()).toBe('conductor');
    });
  });

  describe('getUserId', () => {
    it('returns null when no token is stored', () => {
      expect(service.getUserId()).toBeNull();
    });

    it('returns userId claim when present', () => {
      service.setToken(makeJwt({ userId: 'user-123', sub: 'sub-456' }));
      expect(service.getUserId()).toBe('user-123');
    });

    it('falls back to sub when userId is absent', () => {
      service.setToken(makeJwt({ sub: 'sub-456' }));
      expect(service.getUserId()).toBe('sub-456');
    });
  });

  describe('getEmail', () => {
    it('returns null when no token is stored', () => {
      expect(service.getEmail()).toBeNull();
    });

    it('returns email from JWT payload', () => {
      service.setToken(makeJwt({ email: 'test@logiflow.app' }));
      expect(service.getEmail()).toBe('test@logiflow.app');
    });
  });

  describe('getName', () => {
    it('returns null when no token is stored', () => {
      expect(service.getName()).toBeNull();
    });

    it('returns name from JWT payload', () => {
      service.setToken(makeJwt({ name: 'Elizabeth Correa' }));
      expect(service.getName()).toBe('Elizabeth Correa');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token is stored', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('returns true with a valid non-expired token', () => {
      service.setToken(makeJwt({ role: 'admin' }));
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('returns false with an expired token', () => {
      service.setToken(makeExpiredJwt({ role: 'admin' }));
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('returns false after logout', () => {
      service.setToken(makeJwt({ role: 'admin' }));
      service.logout();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });
});
