import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MapComponent } from '../map/map.component';
import { SocketService } from '../core/services/socket.service';
import { AuthService } from '../core/services/auth.service';
import { VehicleApiService, VehicleRecord, VehicleRoute } from '../core/services/vehicle-api.service';
import { environment } from '../../environments/environment';

export type ActiveView = 'dashboard' | 'fleet' | 'alerts';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('mapRef') mapComponent!: MapComponent;

  activeView: ActiveView = 'dashboard';
  socketError = false;
  routeUpdateCount = 0;
  profileMenuOpen = false;

  readonly userEmail: string;
  readonly userName: string;
  readonly userInitial: string;
  readonly userRole: string;

  fleetVehicles: VehicleRecord[] = [];
  isLoadingFleet = false;
  fleetError: string | null = null;

  selectedVehicle: VehicleRecord | null = null;
  vehicleRoute: VehicleRoute | null = null;
  isLoadingDetail = false;

  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly socketService: SocketService,
    private readonly vehicleApi: VehicleApiService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    const email = this.authService.getEmail() ?? '';
    const name  = this.authService.getName();
    const role  = this.authService.getRole() ?? 'admin';
    this.userEmail   = email;
    this.userName    = name ?? email.split('@')[0];
    this.userRole    = role.toUpperCase();
    const initialSource = name || email;
    this.userInitial = initialSource ? initialSource[0].toUpperCase() : 'A';
  }

  ngOnInit(): void {
    this.socketService.connect();
    this.socketService.joinFleet();

    this.subscriptions.push(
      this.socketService.onVehiclePosition().subscribe((event) => {
        if (!environment.production) console.log('[socket] vehicle:position', event);
      }),
      this.socketService.onRouteUpdate().subscribe((event) => {
        if (!environment.production) console.log('[socket] route:update', event);
        if (this.activeView !== 'dashboard') this.routeUpdateCount++;
      }),
      this.socketService.onVehicleOffline().subscribe((event) => {
        if (!environment.production) console.log('[socket] vehicle:offline', event);
      }),
      this.socketService.onVehicleOnline().subscribe((event) => {
        if (!environment.production) console.log('[socket] vehicle:online', event);
      }),
      this.socketService.onDisconnect().subscribe(() => {
        if (!environment.production) console.warn('[socket] disconnected');
        this.socketError = true;
      }),
      this.socketService.onConnectError().subscribe((err) => {
        if (!environment.production) console.warn('[socket] connect_error', err.message);
        if (err.message === 'Unauthorized') {
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.socketError = true;
      }),
      this.socketService.onJoined().subscribe((ack) => {
        if (!environment.production) console.log('[socket] joined room', ack);
        this.socketError = false;
      }),
    );
  }

  setView(view: ActiveView): void {
    this.activeView = view;
    if (view === 'dashboard') this.routeUpdateCount = 0;
    if (view === 'fleet') this.loadFleet();
  }

  loadFleet(): void {
    this.isLoadingFleet = true;
    this.fleetError = null;
    this.vehicleApi.getAll().subscribe({
      next: (vehicles) => {
        this.fleetVehicles = vehicles;
        this.isLoadingFleet = false;
      },
      error: () => {
        this.fleetError = 'Could not load fleet data. Check connection.';
        this.isLoadingFleet = false;
      },
    });
  }

  selectVehicle(id: string): void {
    this.selectedVehicle = null;
    this.vehicleRoute = null;
    this.isLoadingDetail = true;

    this.vehicleApi.getOne(id).subscribe({
      next: (vehicle) => {
        this.selectedVehicle = vehicle;
        this.vehicleApi.getRoute(id).subscribe({
          next: (route) => { this.vehicleRoute = route; this.isLoadingDetail = false; },
          error: () => { this.isLoadingDetail = false; },
        });
      },
      error: () => { this.isLoadingDetail = false; },
    });
  }

  viewOnMap(id: string): void {
    this.activeView = 'dashboard';
    this.routeUpdateCount = 0;
    setTimeout(() => {
      this.mapComponent?.focusVehicle(id);
      this.selectVehicle(id);
    }, 50);
  }

  closeVehicleDetail(): void {
    this.selectedVehicle = null;
    this.vehicleRoute = null;
  }

  onVehicleClicked(vehicleId: string): void {
    this.mapComponent?.focusVehicle(vehicleId);
    this.selectVehicle(vehicleId);
  }

  reconnect(): void {
    this.socketService.reconnect();
    this.socketService.joinFleet();
    this.socketError = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.socketService.disconnect();
  }
}
