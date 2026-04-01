import { Injectable } from '@angular/core';
import { AuthTokenService, type JwtClaims } from '@logiflow/shared-auth';
import {
  ROUTE_STEP_STATUS,
  type DriverRoute,
  type RouteStep,
} from '@logiflow/shared-models';
import { io, type Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  SocketConnectionConstants,
  SocketEventConstants,
} from '../constants/socket.constants';
import { RouteJwtClaimConstants } from '../../route/route.constants';
import { Observable, Subject } from 'rxjs';
import { type TripStatus } from '../constants/trip-status.constants';

interface RouteUpdatePayload {
  vehicleId?: string;
  stops?: RouteStopPayload[];
}

interface RouteStopPayload {
  id?: string;
  stopId?: string;
  address?: string;
  lat?: number;
  lng?: number;
  order?: number;
  arrivalOrder?: number;
  status?: RouteStep['status'];
}

@Injectable({ providedIn: 'root' })
export class DriverSocketService {
  readonly routeUpdate$: Observable<DriverRoute>;
  readonly error$: Observable<string>;

  private readonly authTokenService = new AuthTokenService(localStorage);
  private readonly routeUpdateSubject = new Subject<DriverRoute>();
  private readonly errorSubject = new Subject<string>();
  private socket: Socket | null = null;
  private activeVehicleId: string | null = null;

  constructor() {
    this.routeUpdate$ = this.routeUpdateSubject.asObservable();
    this.error$ = this.errorSubject.asObservable();

    this.handleSocketConnected = this.handleSocketConnected.bind(this);
    this.handleSocketDisconnected = this.handleSocketDisconnected.bind(this);
    this.handleSocketConnectError = this.handleSocketConnectError.bind(this);
    this.handleRouteUpdateEvent = this.handleRouteUpdateEvent.bind(this);
  }

  connect(vehicleId?: string): void {
    if (this.socket?.connected) {
      return;
    }

    const token = this.authTokenService.getToken();
    if (!token) {
      this.errorSubject.next('Authentication token is missing.');
      return;
    }

    const claims = this.authTokenService.decodeClaims() ?? {};
    const resolvedVehicleId = this.resolveVehicleId(vehicleId, claims);
    if (!resolvedVehicleId) {
      this.errorSubject.next('Vehicle id is missing in JWT claims.');
      return;
    }

    this.activeVehicleId = resolvedVehicleId;
    this.socket = io(environment.socketBaseUrl, {
      autoConnect: false,
      auth: { [SocketConnectionConstants.authTokenKey]: token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.registerSocketListeners(this.socket);
    this.socket.connect();
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.off('connect', this.handleSocketConnected);
    this.socket.off('disconnect', this.handleSocketDisconnected);
    this.socket.off(
      SocketConnectionConstants.connectErrorEvent,
      this.handleSocketConnectError,
    );
    this.socket.off(SocketEventConstants.routeUpdate, this.handleRouteUpdateEvent);
    this.socket.disconnect();
    this.socket = null;
    this.activeVehicleId = null;
  }

  emitStatusUpdate(vehicleId: string, status: TripStatus, stopId: string | null): void {
    if (!this.socket || !this.socket.connected) {
      this.errorSubject.next('Socket is not connected. Unable to emit status update.');
      return;
    }

    this.socket.emit(SocketEventConstants.vehicleStatus, {
      vehicleId,
      status,
      stopId,
      timestamp: new Date().toISOString(),
    });
  }

  private registerSocketListeners(socket: Socket): void {
    socket.on('connect', this.handleSocketConnected);
    socket.on('disconnect', this.handleSocketDisconnected);
    socket.on(
      SocketConnectionConstants.connectErrorEvent,
      this.handleSocketConnectError,
    );
    socket.on(SocketEventConstants.routeUpdate, this.handleRouteUpdateEvent);
  }

  private handleSocketConnected(): void {
    if (!this.socket || !this.activeVehicleId) {
      return;
    }

    this.socket.emit(SocketEventConstants.joinRoom, {
      vehicleId: this.activeVehicleId,
    });
  }

  private handleSocketDisconnected(reason: string): void {
    if (reason === SocketConnectionConstants.disconnectReasonAuth) {
      this.errorSubject.next('Socket authentication failed.');
      return;
    }

    this.errorSubject.next(`Socket disconnected: ${reason}`);
  }

  private handleSocketConnectError(error: Error): void {
    const isAuthError =
      error.message.includes(SocketConnectionConstants.authErrorCode) ||
      error.message.toLowerCase().includes('auth');

    if (isAuthError) {
      this.errorSubject.next('Socket authentication failed.');
      return;
    }

    this.errorSubject.next(`Socket connection failed: ${error.message}`);
  }

  private handleRouteUpdateEvent(payload: RouteUpdatePayload): void {
    const normalizedRoute = normalizeRouteUpdatePayload(
      payload,
      this.activeVehicleId ?? '',
    );
    this.routeUpdateSubject.next(normalizedRoute);
  }

  private resolveVehicleId(explicitVehicleId: string | undefined, claims: JwtClaims): string | null {
    if (typeof explicitVehicleId === 'string' && explicitVehicleId.trim().length > 0) {
      return explicitVehicleId;
    }

    const claimVehicleId = claims[RouteJwtClaimConstants.VehicleId];
    if (typeof claimVehicleId === 'string' && claimVehicleId.trim().length > 0) {
      return claimVehicleId;
    }

    if (typeof claims.sub === 'string' && claims.sub.trim().length > 0) {
      return claims.sub;
    }

    return null;
  }
}

function normalizeRouteUpdatePayload(
  payload: RouteUpdatePayload,
  fallbackVehicleId: string,
): DriverRoute {
  const steps = (payload.stops ?? [])
    .map((step, index) => mapStopPayloadToRouteStep(step, index))
    .sort(compareRouteStepsByArrivalOrder);

  return {
    vehicleId: payload.vehicleId ?? fallbackVehicleId,
    steps,
  };
}

function mapStopPayloadToRouteStep(step: RouteStopPayload, index: number): RouteStep {
  const arrivalOrder = Number(step.arrivalOrder ?? step.order ?? index + 1);
  return {
    stopId: step.stopId ?? step.id ?? `stop-${index + 1}`,
    address: step.address ?? 'Address unavailable',
    lat: Number(step.lat ?? 0),
    lng: Number(step.lng ?? 0),
    arrivalOrder,
    status: normalizeRouteStepStatus(step.status),
  };
}

function normalizeRouteStepStatus(status?: RouteStep['status']): RouteStep['status'] {
  if (status === ROUTE_STEP_STATUS.Active) {
    return ROUTE_STEP_STATUS.Active;
  }

  if (status === ROUTE_STEP_STATUS.Completed) {
    return ROUTE_STEP_STATUS.Completed;
  }

  return ROUTE_STEP_STATUS.Pending;
}

function compareRouteStepsByArrivalOrder(left: RouteStep, right: RouteStep): number {
  return left.arrivalOrder - right.arrivalOrder;
}