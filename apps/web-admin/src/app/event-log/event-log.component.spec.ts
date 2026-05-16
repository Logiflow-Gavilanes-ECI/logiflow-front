import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { of, throwError } from 'rxjs';
import { EventLogComponent } from './event-log.component';
import { SocketService } from '../core/services/socket.service';
import { VehicleApiService } from '../core/services/vehicle-api.service';

const joined$     = new Subject<any>();
const position$   = new Subject<any>();
const route$      = new Subject<any>();
const offline$    = new Subject<any>();
const online$     = new Subject<any>();
const status$     = new Subject<any>();

const makeSocketMock = () => ({
  onJoined:          () => joined$.asObservable(),
  onVehiclePosition: () => position$.asObservable(),
  onRouteUpdate:     () => route$.asObservable(),
  onVehicleOffline:  () => offline$.asObservable(),
  onVehicleOnline:   () => online$.asObservable(),
  onDriverStatus:    () => status$.asObservable(),
});

describe('EventLogComponent', () => {
  let component: EventLogComponent;
  let fixture: ComponentFixture<EventLogComponent>;
  let vehicleApiMock: jasmine.SpyObj<VehicleApiService>;

  beforeEach(async () => {
    vehicleApiMock = jasmine.createSpyObj('VehicleApiService', ['getOne']);
    vehicleApiMock.getOne.and.returnValue(of({ plate: 'ABC-123' } as any));

    await TestBed.configureTestingModule({
      declarations: [EventLogComponent],
      providers: [
        { provide: SocketService, useValue: makeSocketMock() },
        { provide: VehicleApiService, useValue: vehicleApiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with an empty log', () => {
    expect(component.entries.length).toBe(0);
  });

  describe('onJoined', () => {
    it('adds a system entry with the room name', () => {
      joined$.next({ room: 'fleet' });
      expect(component.entries[0].type).toBe('system');
      expect(component.entries[0].message).toContain('fleet');
    });
  });

  describe('onVehiclePosition', () => {
    it('adds a position entry with the vehicle plate', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.6097, lng: -74.0817, speed: 40, timestamp: 'now' });
      expect(component.entries[0].type).toBe('position');
      expect(component.entries[0].message).toContain('ABC-123');
      expect(component.entries[0].message).toContain('4.6097');
    });

    it('uses cached plate on second event for same vehicle', () => {
      position$.next({ vehicleId: 'v-001', lat: 4.1, lng: -74.0, speed: 20, timestamp: 'now' });
      position$.next({ vehicleId: 'v-001', lat: 4.2, lng: -74.1, speed: 25, timestamp: 'now' });
      // getOne should only be called once (cache hit on second)
      expect(vehicleApiMock.getOne).toHaveBeenCalledTimes(1);
    });

    it('falls back to vehicleId if API call fails', () => {
      vehicleApiMock.getOne.and.returnValue(throwError(() => new Error('not found')));
      position$.next({ vehicleId: 'v-999', lat: 1.0, lng: -1.0, speed: 0, timestamp: 'now' });
      expect(component.entries[0].message).toContain('v-999');
    });
  });

  describe('onRouteUpdate', () => {
    it('adds a route entry with stop count and plate', () => {
      route$.next({ vehicleId: 'v-001', stops: [{}, {}, {}], estimatedTime: 15, timestamp: 'now' });
      expect(component.entries[0].type).toBe('route');
      expect(component.entries[0].message).toContain('ABC-123');
      expect(component.entries[0].message).toContain('3 paradas');
      expect(component.entries[0].message).toContain('15 min');
    });

    it('omits ETA when estimatedTime is absent', () => {
      route$.next({ vehicleId: 'v-001', stops: [{}], timestamp: 'now' });
      expect(component.entries[0].message).not.toContain('min');
    });
  });

  describe('onVehicleOffline', () => {
    it('adds an offline entry with the vehicle plate', () => {
      offline$.next({ vehicleId: 'v-001' });
      expect(component.entries[0].type).toBe('offline');
      expect(component.entries[0].message).toContain('ABC-123');
      expect(component.entries[0].message).toContain('SIN SEÑAL');
    });
  });

  describe('onVehicleOnline', () => {
    it('adds a system entry when vehicle reconnects', () => {
      online$.next({ vehicleId: 'v-001' });
      expect(component.entries[0].type).toBe('system');
      expect(component.entries[0].message).toContain('ABC-123');
      expect(component.entries[0].message).toContain('reconectado');
    });
  });

  describe('onDriverStatus', () => {
    it('adds a status entry with DELIVERED icon', () => {
      status$.next({ vehicleId: 'v-001', status: 'DELIVERED', stopId: 's1', timestamp: 'now' });
      expect(component.entries[0].type).toBe('status');
      expect(component.entries[0].message).toContain('📦');
      expect(component.entries[0].message).toContain('ABC-123');
    });

    it('adds a status entry with ARRIVED icon', () => {
      status$.next({ vehicleId: 'v-001', status: 'ARRIVED', stopId: 's1', timestamp: 'now' });
      expect(component.entries[0].message).toContain('📍');
    });

    it('uses default icon for unknown status', () => {
      status$.next({ vehicleId: 'v-001', status: 'UNKNOWN', stopId: null, timestamp: 'now' });
      expect(component.entries[0].message).toContain('🔔');
    });
  });

  describe('entry cap', () => {
    it('keeps at most 100 entries', () => {
      for (let i = 0; i < 110; i++) {
        joined$.next({ room: `room-${i}` });
      }
      expect(component.entries.length).toBe(100);
    });
  });
});
