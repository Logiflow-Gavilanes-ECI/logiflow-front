import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../core/services/socket.service';
import { VehicleApiService } from '../core/services/vehicle-api.service';

interface VehicleState {
  vehicleId: string;
  plate: string;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  isOffline: boolean;
}

@Component({
  selector: 'app-vehicle-list',
  templateUrl: './vehicle-list.component.html',
  styleUrls: ['./vehicle-list.component.scss'],
  standalone: false,
})
export class VehicleListComponent implements OnInit, OnDestroy {
  @Output() vehicleClicked = new EventEmitter<string>();

  vehicles: VehicleState[] = [];
  routeCount = 0;
  isLoading = true;
  filterStatus: 'all' | 'online' | 'offline' = 'all';

  private readonly vehicleMap: Record<string, VehicleState> = {};
  private readonly plateCache: Record<string, string> = {};
  private readonly offlineTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  private readonly subscriptions: Subscription[] = [];
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly OFFLINE_GRACE_MS = 15_000;

  get onlineCount(): number {
    return this.vehicles.filter((v) => !v.isOffline).length;
  }

  get offlineCount(): number {
    return this.vehicles.filter((v) => v.isOffline).length;
  }

  get filteredVehicles(): VehicleState[] {
    if (this.filterStatus === 'online') return this.vehicles.filter((v) => !v.isOffline);
    if (this.filterStatus === 'offline') return this.vehicles.filter((v) => v.isOffline);
    return this.vehicles;
  }

  setFilter(status: 'all' | 'online' | 'offline'): void {
    this.filterStatus = status;
  }

  constructor(
    private readonly socketService: SocketService,
    private readonly vehicleApi: VehicleApiService,
  ) {}

  ngOnInit(): void {
    this.loadingTimer = setTimeout(() => this.stopLoading(), 8000);

    this.subscriptions.push(
      this.socketService.onVehiclePosition().subscribe((data) => {
        this.stopLoading();
        this.cancelOfflineTimer(data.vehicleId);
        this.upsert(data.vehicleId, { lat: data.lat, lng: data.lng, speed: data.speed, isOffline: false });
      }),
      this.socketService.onVehicleOffline().subscribe((data) => {
        if (this.offlineTimers[data.vehicleId]) return;
        this.offlineTimers[data.vehicleId] = setTimeout(() => {
          delete this.offlineTimers[data.vehicleId];
          this.upsert(data.vehicleId, { isOffline: true });
        }, VehicleListComponent.OFFLINE_GRACE_MS);
      }),
      this.socketService.onVehicleOnline().subscribe((data) => {
        this.cancelOfflineTimer(data.vehicleId);
        this.upsert(data.vehicleId, { isOffline: false });
      }),
      this.socketService.onRouteUpdate().subscribe(() => {
        this.routeCount++;
      }),
    );
  }

  private cancelOfflineTimer(vehicleId: string): void {
    if (this.offlineTimers[vehicleId]) {
      clearTimeout(this.offlineTimers[vehicleId]);
      delete this.offlineTimers[vehicleId];
    }
  }

  private stopLoading(): void {
    if (!this.isLoading) return;
    this.isLoading = false;
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  }

  private upsert(vehicleId: string, patch: Partial<VehicleState>): void {
    if (!this.vehicleMap[vehicleId]) {
      const plate = this.plateCache[vehicleId] ?? vehicleId.slice(0, 8);
      this.vehicleMap[vehicleId] = { vehicleId, plate, lat: null, lng: null, speed: null, isOffline: false };
      if (!this.plateCache[vehicleId]) {
        this.vehicleApi.getOne(vehicleId).subscribe({
          next: (v) => {
            this.plateCache[vehicleId] = v.plate;
            this.vehicleMap[vehicleId].plate = v.plate;
            this.vehicles = Object.values(this.vehicleMap);
          },
        });
      }
    }
    Object.assign(this.vehicleMap[vehicleId], patch);
    this.vehicles = Object.values(this.vehicleMap);
  }

  onCardClick(vehicleId: string): void {
    this.vehicleClicked.emit(vehicleId);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    if (this.loadingTimer) clearTimeout(this.loadingTimer);
    Object.values(this.offlineTimers).forEach((t) => clearTimeout(t));
  }
}
