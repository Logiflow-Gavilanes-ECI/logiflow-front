import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../core/services/socket.service';

interface VehicleState {
  vehicleId: string;
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

  private readonly vehicleMap: Record<string, VehicleState> = {};
  private readonly subscriptions: Subscription[] = [];
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;

  get onlineCount(): number {
    return this.vehicles.filter((v) => !v.isOffline).length;
  }

  get offlineCount(): number {
    return this.vehicles.filter((v) => v.isOffline).length;
  }

  constructor(private readonly socketService: SocketService) {}

  ngOnInit(): void {
    this.loadingTimer = setTimeout(() => this.stopLoading(), 8000);

    this.subscriptions.push(
      this.socketService.onVehiclePosition().subscribe((data) => {
        this.stopLoading();
        this.upsert(data.vehicleId, { lat: data.lat, lng: data.lng, speed: data.speed, isOffline: false });
      }),
      this.socketService.onVehicleOffline().subscribe((data) => {
        this.upsert(data.vehicleId, { isOffline: true });
      }),
      this.socketService.onVehicleOnline().subscribe((data) => {
        this.upsert(data.vehicleId, { isOffline: false });
      }),
      this.socketService.onRouteUpdate().subscribe(() => {
        this.routeCount++;
      }),
    );
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
      this.vehicleMap[vehicleId] = { vehicleId, lat: null, lng: null, speed: null, isOffline: false };
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
  }
}
