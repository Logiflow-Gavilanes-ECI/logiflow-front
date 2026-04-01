import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ROUTE_STEP_STATUS,
  type DriverRoute,
  type RouteStep,
} from '@logiflow/shared-models';
import { AuthTokenService, type JwtClaims } from '@logiflow/shared-auth';
import { environment } from '../../../environments/environment';
import { RouteApiConstants, RouteJwtClaimConstants } from '../../route/route.constants';

interface DriverRouteApiResponse {
  vehicleId?: string;
  steps?: RouteStepApiResponse[];
}

interface RouteStepApiResponse {
  stopId?: string;
  id?: string;
  address?: string;
  lat?: number;
  lng?: number;
  arrivalOrder?: number;
  order?: number;
  status?: RouteStep['status'];
}

@Injectable({ providedIn: 'root' })
export class RouteService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async getDriverRoute(): Promise<DriverRoute> {
    const token = this.authTokenService.getToken();
    const claims = this.authTokenService.decodeClaims() ?? {};
    const vehicleId = this.resolveVehicleId(claims);

    const routePath = this.buildDriverRoutePath(vehicleId);
    const headers = this.buildRequestHeaders(token);
    const response = await firstValueFrom(
      this.httpClient.get<DriverRouteApiResponse>(`${environment.apiBaseUrl}${routePath}`, {
        headers,
      }),
    );

    return this.normalizeDriverRoute(vehicleId, response);
  }

  private resolveVehicleId(claims: JwtClaims): string {
    const claimVehicleId = claims[RouteJwtClaimConstants.VehicleId];
    if (typeof claimVehicleId === 'string' && claimVehicleId.trim().length > 0) {
      return claimVehicleId;
    }

    if (typeof claims.sub === 'string' && claims.sub.trim().length > 0) {
      return claims.sub;
    }

    throw new Error('Vehicle id is missing in JWT claims.');
  }

  private buildDriverRoutePath(vehicleId: string): string {
    return RouteApiConstants.DriverRoutePathTemplate.replace('{vehicleId}', encodeURIComponent(vehicleId));
  }

  private buildRequestHeaders(token: string | null): HttpHeaders {
    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private normalizeDriverRoute(
    fallbackVehicleId: string,
    response: DriverRouteApiResponse,
  ): DriverRoute {
    const stepsSource = Array.isArray(response.steps) ? response.steps : [];
    const normalizedSteps = stepsSource
      .map((step, index) => this.normalizeRouteStep(step, index))
      .sort(compareRouteStepsByArrivalOrder);

    return {
      vehicleId: response.vehicleId ?? fallbackVehicleId,
      steps: normalizedSteps,
    };
  }

  private normalizeRouteStep(step: RouteStepApiResponse, index: number): RouteStep {
    const stopId = step.stopId ?? step.id ?? `stop-${index + 1}`;
    const arrivalOrder = step.arrivalOrder ?? step.order ?? index + 1;

    return {
      stopId,
      address: step.address ?? 'Address unavailable',
      lat: Number(step.lat ?? 0),
      lng: Number(step.lng ?? 0),
      arrivalOrder,
      status: this.normalizeStatus(step.status),
    };
  }

  private normalizeStatus(status?: RouteStep['status']): RouteStep['status'] {
    if (status === ROUTE_STEP_STATUS.Active) {
      return ROUTE_STEP_STATUS.Active;
    }

    if (status === ROUTE_STEP_STATUS.Completed) {
      return ROUTE_STEP_STATUS.Completed;
    }

    return ROUTE_STEP_STATUS.Pending;
  }
}

function compareRouteStepsByArrivalOrder(left: RouteStep, right: RouteStep): number {
  return left.arrivalOrder - right.arrivalOrder;
}
