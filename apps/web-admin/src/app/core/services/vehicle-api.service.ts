import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface VehicleRecord {
  id: string;
  plate: string;
  model: string;
  status: string;
  lat: number;
  lng: number;
  capacity: number;
}

export interface VehicleRouteStep {
  stopId: string;
  address: string;
  lat: number;
  lng: number;
  arrivalOrder: number;
  status: 'pending' | 'active' | 'completed';
}

export interface VehicleRoute {
  vehicleId: string;
  steps: VehicleRouteStep[];
}

@Injectable({ providedIn: 'root' })
export class VehicleApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  getAll(): Observable<VehicleRecord[]> {
    return this.http.get<VehicleRecord[]>(
      `${environment.apiUrl}/vehicles`,
      { headers: this.authHeaders() },
    );
  }

  getOne(id: string): Observable<VehicleRecord> {
    return this.http.get<VehicleRecord>(
      `${environment.apiUrl}/vehicles/${id}`,
      { headers: this.authHeaders() },
    );
  }

  getRoute(id: string): Observable<VehicleRoute> {
    return this.http.get<VehicleRoute>(
      `${environment.apiUrl}/vehicles/${id}/route`,
      { headers: this.authHeaders() },
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken() ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
