import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface VehicleDetails {
  vehicleId: string;
  plate: string;
  model: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class VehicleService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly authService: AuthService,
  ) {}

  async getVehicleDetails(vehicleId: string): Promise<VehicleDetails | null> {
    try {
      const token = await this.authService.getToken();
      const headers = token
        ? new HttpHeaders({ Authorization: `Bearer ${token}` })
        : new HttpHeaders();

      return await firstValueFrom(
        this.httpClient.get<VehicleDetails>(
          `${environment.apiBaseUrl}/api/v1/vehicles/${encodeURIComponent(vehicleId)}`,
          { headers },
        ),
      );
    } catch {
      return null;
    }
  }
}
