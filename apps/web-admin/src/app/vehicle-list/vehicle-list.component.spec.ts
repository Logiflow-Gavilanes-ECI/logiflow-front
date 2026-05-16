import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { of } from 'rxjs';
import { VehicleListComponent } from './vehicle-list.component';
import { SocketService } from '../core/services/socket.service';
import { VehicleApiService } from '../core/services/vehicle-api.service';

const position$ = new Subject<any>();
const offline$  = new Subject<any>();
const online$   = new Subject<any>();
const route$    = new Subject<any>();

const makeSocketMock = () => ({
  onVehiclePosition: () => position$.asObservable(),
  onVehicleOffline:  () => offline$.asObservable(),
  onVehicleOnline:   () => online$.asObservable(),
  onRouteUpdate:     () => route$.asObservable(),
});

describe('VehicleListComponent', () => {
  let component: VehicleListComponent;
  let fixture: ComponentFixture<VehicleListComponent>;
  let vehicleApiMock: jasmine.SpyObj<VehicleApiService>;

  beforeEach(async () => {
    vehicleApiMock = jasmine.createSpyObj('VehicleApiService', ['getOne']);
    vehicleApiMock.getOne.and.returnValue(of({ plate: 'XYZ-999' } as any));

    await TestBed.configureTestingModule({
      declarations: [VehicleListComponent],
      providers: [
        { provide: SocketService, useValue: makeSocketMock() },
        { provide: VehicleApiService, useValue: vehicleApiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with isLoading true and empty vehicles', () => {
    expect(component.isLoading).toBeTrue();
    expect(component.vehicles.length).toBe(0);
  });

  describe('onVehiclePosition', () => {
    it('adds a new vehicle on first position event', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 30, timestamp: 'now' });
      expect(component.vehicles.length).toBe(1);
      expect(component.vehicles[0].vehicleId).toBe('v-001');
    });

    it('stops loading on first position event', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 30, timestamp: 'now' });
      expect(component.isLoading).toBeFalse();
    });

    it('updates existing vehicle position on subsequent events', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 20, timestamp: 'now' });
      position$.next({ vehicleId: 'v-001', lat: 5.0, lng: -73.0, speed: 40, timestamp: 'now' });
      expect(component.vehicles.length).toBe(1);
      expect(component.vehicles[0].lat).toBe(5.0);
      expect(component.vehicles[0].speed).toBe(40);
    });

    it('fetches plate from API on new vehicle', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 30, timestamp: 'now' });
      expect(vehicleApiMock.getOne).toHaveBeenCalledWith('v-001');
      expect(component.vehicles[0].plate).toBe('XYZ-999');
    });

    it('does not fetch plate again on second event for same vehicle', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 30, timestamp: 'now' });
      position$.next({ vehicleId: 'v-001', lat: 5.0, lng: -73.0, speed: 40, timestamp: 'now' });
      expect(vehicleApiMock.getOne).toHaveBeenCalledTimes(1);
    });

    it('sets isOffline to false on position event', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 30, timestamp: 'now' });
      offline$.next({ vehicleId: 'v-001' });
      position$.next({ vehicleId: 'v-001', lat: 4.7, lng: -74.1, speed: 10, timestamp: 'now' });
      expect(component.vehicles[0].isOffline).toBeFalse();
    });
  });

  describe('onVehicleOnline', () => {
    it('marks vehicle as online', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 0, timestamp: 'now' });
      online$.next({ vehicleId: 'v-001' });
      expect(component.vehicles[0].isOffline).toBeFalse();
    });
  });

  describe('onRouteUpdate', () => {
    it('increments routeCount on each route update', () => {
      route$.next({ vehicleId: 'v-001', stops: [], timestamp: 'now' });
      route$.next({ vehicleId: 'v-001', stops: [], timestamp: 'now' });
      expect(component.routeCount).toBe(2);
    });
  });

  describe('computed counts', () => {
    beforeEach(() => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 0, timestamp: 'now' });
      position$.next({ vehicleId: 'v-002', lat: 4.7, lng: -74.1, speed: 0, timestamp: 'now' });
    });

    it('onlineCount returns count of non-offline vehicles', () => {
      expect(component.onlineCount).toBe(2);
    });

    it('offlineCount returns count of offline vehicles', fakeAsync(() => {
      offline$.next({ vehicleId: 'v-001' });
      tick(15001);
      expect(component.offlineCount).toBe(1);
    }));
  });

  describe('filteredVehicles', () => {
    beforeEach(fakeAsync(() => {
      position$.next({ vehicleId: 'v-001', lat: 4.6, lng: -74.0, speed: 0, timestamp: 'now' });
      position$.next({ vehicleId: 'v-002', lat: 4.7, lng: -74.1, speed: 0, timestamp: 'now' });
      offline$.next({ vehicleId: 'v-002' });
      tick(15001);
    }));

    it('returns all vehicles when filter is all', () => {
      component.setFilter('all');
      expect(component.filteredVehicles.length).toBe(2);
    });

    it('returns only online vehicles when filter is online', () => {
      component.setFilter('online');
      expect(component.filteredVehicles.every((v) => !v.isOffline)).toBeTrue();
    });

    it('returns only offline vehicles when filter is offline', () => {
      component.setFilter('offline');
      expect(component.filteredVehicles.every((v) => v.isOffline)).toBeTrue();
    });
  });

  describe('onCardClick', () => {
    it('emits vehicleClicked with the vehicleId', () => {
      let emitted: string | undefined;
      component.vehicleClicked.subscribe((id) => (emitted = id));
      component.onCardClick('v-001');
      expect(emitted).toBe('v-001');
    });
  });

  describe('loading timeout', () => {
    let clockComponent: VehicleListComponent;
    let clockFixture: ComponentFixture<VehicleListComponent>;

    beforeEach(async () => {
      jasmine.clock().install();
      clockFixture = TestBed.createComponent(VehicleListComponent);
      clockComponent = clockFixture.componentInstance;
      clockFixture.detectChanges();
    });

    afterEach(() => {
      clockComponent.ngOnDestroy();
      jasmine.clock().uninstall();
    });

    it('stops loading after 8 seconds even with no events', () => {
      expect(clockComponent.isLoading).toBeTrue();
      jasmine.clock().tick(8001);
      expect(clockComponent.isLoading).toBeFalse();
    });
  });
});
