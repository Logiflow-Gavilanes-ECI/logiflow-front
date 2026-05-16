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

      const url = `${environment.apiBaseUrl}/vehicles/${encodeURIComponent(vehicleId)}`;
      console.log(`[VehicleService] GET ${url}`);
      const result = await firstValueFrom(
        this.httpClient.get<VehicleDetails>(url, { headers }),
      );
      console.log(`[VehicleService] response: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const e = error as Record<string, unknown>;
      console.error(`[VehicleService] failed — status: ${JSON.stringify(e?.['status'])} message: ${JSON.stringify(e?.['message'])} error: ${JSON.stringify(e?.['error'])}`);
      return null;
    }
  }
}
