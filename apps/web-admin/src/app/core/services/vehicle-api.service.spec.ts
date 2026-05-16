import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { VehicleApiService } from './vehicle-api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('VehicleApiService', () => {
  let service: VehicleApiService;
  let httpMock: HttpTestingController;
  let authMock: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authMock = jasmine.createSpyObj('AuthService', ['getToken']);
    authMock.getToken.and.returnValue('test.jwt.token');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        VehicleApiService,
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(VehicleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll()', () => {
    it('sends GET to /vehicles with Authorization header', () => {
      service.getAll().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/vehicles`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test.jwt.token');
      req.flush([]);
    });

    it('returns the vehicle list from the response', (done) => {
      const vehicles = [{ id: '1', plate: 'ABC-123' }];
      service.getAll().subscribe((result) => {
        expect(result).toEqual(vehicles as any);
        done();
      });
      httpMock.expectOne(`${environment.apiUrl}/vehicles`).flush(vehicles);
    });
  });

  describe('getOne()', () => {
    it('sends GET to /vehicles/:id with Authorization header', () => {
      service.getOne('v-001').subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/vehicles/v-001`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test.jwt.token');
      req.flush({ id: 'v-001', plate: 'ABC-001' });
    });

    it('returns the vehicle record', (done) => {
      const vehicle = { id: 'v-001', plate: 'ABC-001' };
      service.getOne('v-001').subscribe((result) => {
        expect(result).toEqual(vehicle as any);
        done();
      });
      httpMock.expectOne(`${environment.apiUrl}/vehicles/v-001`).flush(vehicle);
    });
  });

  describe('getRoute()', () => {
    it('sends GET to /vehicles/:id/route with Authorization header', () => {
      service.getRoute('v-001').subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/vehicles/v-001/route`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test.jwt.token');
      req.flush({ vehicleId: 'v-001', steps: [] });
    });

    it('returns the route for the vehicle', (done) => {
      const route = { vehicleId: 'v-001', steps: [] };
      service.getRoute('v-001').subscribe((result) => {
        expect(result).toEqual(route as any);
        done();
      });
      httpMock.expectOne(`${environment.apiUrl}/vehicles/v-001/route`).flush(route);
    });
  });

  describe('auth header fallback', () => {
    it('uses empty string when token is null', () => {
      authMock.getToken.and.returnValue(null);
      service.getAll().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/vehicles`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer ');
      req.flush([]);
    });
  });
});
