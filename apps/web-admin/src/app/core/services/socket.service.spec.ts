import { TestBed } from '@angular/core/testing';
import { SocketService } from './socket.service';
import { AuthService } from './auth.service';

describe('SocketService', () => {
  let service: SocketService;
  let authMock: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authMock = jasmine.createSpyObj('AuthService', ['getToken', 'logout']);
    authMock.getToken.and.returnValue('test.jwt.token');

    TestBed.configureTestingModule({
      providers: [
        SocketService,
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(SocketService);
  });

  afterEach(() => {
    // Disconnect to avoid socket.io trying to reconnect between tests
    try { service.disconnect(); } catch { /* ignore */ }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('connect()', () => {
    it('reads the JWT token from AuthService', () => {
      service.connect();
      expect(authMock.getToken).toHaveBeenCalled();
    });

    it('does not read token again if already connected', () => {
      service.connect();
      service.connect();
      // getToken called once at creation, not a second time
      expect(authMock.getToken).toHaveBeenCalledTimes(1);
    });

    it('creates a new socket after disconnect', () => {
      service.connect();
      service.disconnect();
      service.connect();
      expect(authMock.getToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('reconnect()', () => {
    it('disconnects and reconnects, reading token again', () => {
      service.connect();
      service.reconnect();
      expect(authMock.getToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('observable getters', () => {
    it('onVehiclePosition returns an observable', () => {
      expect(service.onVehiclePosition()).toBeDefined();
    });

    it('onRouteUpdate returns an observable', () => {
      expect(service.onRouteUpdate()).toBeDefined();
    });

    it('onVehicleOffline returns an observable', () => {
      expect(service.onVehicleOffline()).toBeDefined();
    });

    it('onVehicleOnline returns an observable', () => {
      expect(service.onVehicleOnline()).toBeDefined();
    });

    it('onJoined returns an observable', () => {
      expect(service.onJoined()).toBeDefined();
    });

    it('onDisconnect returns an observable', () => {
      expect(service.onDisconnect()).toBeDefined();
    });

    it('onConnectError returns an observable', () => {
      expect(service.onConnectError()).toBeDefined();
    });

    it('onDriverStatus returns an observable', () => {
      expect(service.onDriverStatus()).toBeDefined();
    });
  });

  describe('event forwarding via internal subjects', () => {
    it('onVehiclePosition emits events pushed to position$', (done) => {
      const payload = { vehicleId: 'v-001', lat: 4.6, lng: -74.08, speed: 30, timestamp: 'now' };
      service.onVehiclePosition().subscribe((p) => { expect(p).toEqual(payload); done(); });
      (service as any).position$.next(payload);
    });

    it('onRouteUpdate emits events pushed to routeUpdate$', (done) => {
      const payload = { vehicleId: 'v-001', stops: [], polyline: [], timestamp: 'now' };
      service.onRouteUpdate().subscribe((p) => { expect(p).toEqual(payload); done(); });
      (service as any).routeUpdate$.next(payload);
    });

    it('onVehicleOffline emits events pushed to vehicleOffline$', (done) => {
      const payload = { vehicleId: 'v-002' };
      service.onVehicleOffline().subscribe((p) => { expect(p).toEqual(payload); done(); });
      (service as any).vehicleOffline$.next(payload);
    });

    it('onVehicleOnline emits events pushed to vehicleOnline$', (done) => {
      const payload = { vehicleId: 'v-003' };
      service.onVehicleOnline().subscribe((p) => { expect(p).toEqual(payload); done(); });
      (service as any).vehicleOnline$.next(payload);
    });

    it('onJoined emits events pushed to joined$', (done) => {
      const payload = { room: 'fleet' };
      service.onJoined().subscribe((p) => { expect(p).toEqual(payload); done(); });
      (service as any).joined$.next(payload);
    });

    it('onDisconnect emits when disconnect$ fires', (done) => {
      service.onDisconnect().subscribe(() => done());
      (service as any).disconnect$.next();
    });

    it('onConnectError emits errors pushed to connectError$', (done) => {
      const err = new Error('socket error');
      service.onConnectError().subscribe((e) => { expect(e).toBe(err); done(); });
      (service as any).connectError$.next(err);
    });
  });

  describe('ngOnDestroy()', () => {
    it('does not throw when destroyed without connecting', () => {
      expect(() => service.ngOnDestroy()).not.toThrow();
    });
  });
});
