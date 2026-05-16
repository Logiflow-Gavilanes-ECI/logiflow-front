import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { EMPTY, of, Subject } from 'rxjs';

import { HomePage } from './home.page';
import { SocketService } from '../core/services/socket.service';
import { AuthService } from '../core/services/auth.service';
import { VehicleApiService } from '../core/services/vehicle-api.service';

const disconnectSubject = new Subject<void>();

const makeSocketServiceMock = () => ({
  connect: jasmine.createSpy('connect'),
  disconnect: jasmine.createSpy('disconnect'),
  reconnect: jasmine.createSpy('reconnect'),
  joinFleet: jasmine.createSpy('joinFleet'),
  onVehiclePosition: () => EMPTY,
  onRouteUpdate: () => EMPTY,
  onVehicleOffline: () => EMPTY,
  onVehicleOnline: () => EMPTY,
  onDisconnect: () => disconnectSubject.asObservable(),
  onConnectError: () => EMPTY,
  onJoined: () => EMPTY,
});

const makeAuthServiceMock = () => ({
  getEmail: jasmine.createSpy('getEmail').and.returnValue('test@logiflow.app'),
  getName: jasmine.createSpy('getName').and.returnValue('Test User'),
  getRole: jasmine.createSpy('getRole').and.returnValue('admin'),
  logout: jasmine.createSpy('logout'),
});

const makeVehicleApiMock = () => ({
  getAll: jasmine.createSpy('getAll').and.returnValue(of([])),
  getOne: jasmine.createSpy('getOne').and.returnValue(EMPTY),
  getRoute: jasmine.createSpy('getRoute').and.returnValue(EMPTY),
});

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let socketMock: ReturnType<typeof makeSocketServiceMock>;
  let authMock: ReturnType<typeof makeAuthServiceMock>;
  let vehicleApiMock: ReturnType<typeof makeVehicleApiMock>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    socketMock = makeSocketServiceMock();
    authMock = makeAuthServiceMock();
    vehicleApiMock = makeVehicleApiMock();
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: SocketService, useValue: socketMock },
        { provide: AuthService, useValue: authMock },
        { provide: VehicleApiService, useValue: vehicleApiMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('connects socket and joins fleet on init', () => {
    expect(socketMock.connect).toHaveBeenCalled();
    expect(socketMock.joinFleet).toHaveBeenCalled();
  });

  it('reads user info from AuthService in constructor', () => {
    expect(component.userEmail).toBe('test@logiflow.app');
    expect(component.userName).toBe('Test User');
    expect(component.userRole).toBe('ADMIN');
    expect(component.userInitial).toBe('T');
  });

  it('logout calls authService.logout and navigates to /login', () => {
    component.logout();
    expect(authMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('reconnect calls socketService.reconnect and joinFleet', () => {
    component.socketError = true;
    component.reconnect();
    expect(socketMock.reconnect).toHaveBeenCalled();
    expect(socketMock.joinFleet).toHaveBeenCalledTimes(2); // init + reconnect
    expect(component.socketError).toBeFalse();
  });

  it('setView fleet triggers loadFleet', () => {
    component.setView('fleet');
    expect(vehicleApiMock.getAll).toHaveBeenCalled();
  });

  it('setView dashboard resets routeUpdateCount', () => {
    component.routeUpdateCount = 5;
    component.setView('dashboard');
    expect(component.routeUpdateCount).toBe(0);
  });

  it('onDisconnect sets socketError to true', () => {
    disconnectSubject.next();
    expect(component.socketError).toBeTrue();
  });

  it('disconnects socket on destroy', () => {
    component.ngOnDestroy();
    expect(socketMock.disconnect).toHaveBeenCalled();
  });
});
