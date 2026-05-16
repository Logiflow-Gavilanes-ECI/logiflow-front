import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { LogiFlowSocketService } from '@logiflow/shared-socket';
import type {
  VehiclePositionEvent,
  RouteUpdateEvent,
  VehicleStatusEvent,
  JoinRoomAck,
} from '@logiflow/shared-models';
import type { VehicleDriverStatusEvent } from '@logiflow/shared-socket';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: LogiFlowSocketService | null = null;

  private readonly position$ = new Subject<VehiclePositionEvent>();
  private readonly routeUpdate$ = new Subject<RouteUpdateEvent>();
  private readonly vehicleOffline$ = new Subject<VehicleStatusEvent>();
  private readonly vehicleOnline$ = new Subject<VehicleStatusEvent>();
  private readonly joined$ = new Subject<JoinRoomAck>();
  private readonly disconnect$ = new Subject<void>();
  private readonly connectError$ = new Subject<Error>();
  private readonly driverStatus$ = new Subject<VehicleDriverStatusEvent>();

  constructor(private readonly authService: AuthService) {}

  connect(): void {
    if (this.socket) return;

    const token = this.authService.getToken() ?? '';
    this.socket = new LogiFlowSocketService({ url: environment.realtimeUrl, autoConnect: false, auth: { token } });

    this.socket.onVehiclePosition((p) => this.position$.next(p));
    this.socket.onRouteUpdate((p) => this.routeUpdate$.next(p));
    this.socket.onVehicleOffline((p) => this.vehicleOffline$.next(p));
    this.socket.onVehicleOnline((p) => this.vehicleOnline$.next(p));
    this.socket.onJoined((p) => this.joined$.next(p));
    this.socket.onVehicleDriverStatus((p) => this.driverStatus$.next(p));
    this.socket.onDisconnect(() => this.disconnect$.next());
    this.socket.onConnectError((err) => {
      this.connectError$.next(err);
      if (err.message === 'Unauthorized') {
        this.authService.logout();
      }
    });

    this.socket.connect();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  joinFleet(): void {
    this.socket?.joinFleet();
  }

  joinVehicle(vehicleId: string): void {
    this.socket?.joinVehicle({ vehicleId });
  }

  onVehiclePosition(): Observable<VehiclePositionEvent> {
    return this.position$.asObservable();
  }

  onRouteUpdate(): Observable<RouteUpdateEvent> {
    return this.routeUpdate$.asObservable();
  }

  onVehicleOffline(): Observable<VehicleStatusEvent> {
    return this.vehicleOffline$.asObservable();
  }

  onVehicleOnline(): Observable<VehicleStatusEvent> {
    return this.vehicleOnline$.asObservable();
  }

  onJoined(): Observable<JoinRoomAck> {
    return this.joined$.asObservable();
  }

  onDisconnect(): Observable<void> {
    return this.disconnect$.asObservable();
  }

  onConnectError(): Observable<Error> {
    return this.connectError$.asObservable();
  }

  onDriverStatus(): Observable<VehicleDriverStatusEvent> {
    return this.driverStatus$.asObservable();
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.position$.complete();
    this.routeUpdate$.complete();
    this.vehicleOffline$.complete();
    this.vehicleOnline$.complete();
    this.joined$.complete();
    this.disconnect$.complete();
    this.connectError$.complete();
  }
}
