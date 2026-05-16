import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../core/services/socket.service';
import { VehicleApiService } from '../core/services/vehicle-api.service';

type LogType = 'system' | 'position' | 'route' | 'offline' | 'status';

interface LogEntry {
  time: string;
  type: LogType;
  message: string;
}

const MAX_ENTRIES = 100;

@Component({
  selector: 'app-event-log',
  templateUrl: './event-log.component.html',
  styleUrls: ['./event-log.component.scss'],
  standalone: false,
})
export class EventLogComponent implements OnInit, OnDestroy {
  entries: LogEntry[] = [];

  private readonly subscriptions: Subscription[] = [];
  private readonly plateCache: Record<string, string> = {};

  constructor(
    private readonly socketService: SocketService,
    private readonly vehicleApi: VehicleApiService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.socketService.onJoined().subscribe((data) => {
        this.add('system', `Room joined: ${data.room}`);
      }),
      this.socketService.onVehiclePosition().subscribe((data) => {
        this.withPlate(data.vehicleId, (plate) =>
          this.add('position', `${plate} → ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)} · ${data.speed} km/h`),
        );
      }),
      this.socketService.onRouteUpdate().subscribe((data) => {
        const eta = data.estimatedTime ? `, ${data.estimatedTime} min` : '';
        this.withPlate(data.vehicleId, (plate) =>
          this.add('route', `Ruta para ${plate} → ${data.stops.length} paradas${eta}`),
        );
      }),
      this.socketService.onVehicleOffline().subscribe((data) => {
        this.withPlate(data.vehicleId, (plate) =>
          this.add('offline', `⚠ ${plate} SIN SEÑAL`),
        );
      }),
      this.socketService.onVehicleOnline().subscribe((data) => {
        this.withPlate(data.vehicleId, (plate) =>
          this.add('system', `✓ ${plate} reconectado`),
        );
      }),
      this.socketService.onDriverStatus().subscribe((data) => {
        const iconMap: Record<string, string> = { DELIVERED: '📦', ARRIVED: '📍', START: '🚗' };
        const icon = iconMap[data.status] ?? '🔔';
        this.withPlate(data.vehicleId, (plate) =>
          this.add('status', `${icon} ${plate} → ${data.status}`),
        );
      }),
    );
  }

  private withPlate(vehicleId: string, cb: (plate: string) => void): void {
    const cached = this.plateCache[vehicleId];
    if (cached) {
      cb(cached);
      return;
    }
    this.vehicleApi.getOne(vehicleId).subscribe({
      next: (v) => {
        this.plateCache[vehicleId] = v.plate;
        cb(v.plate);
      },
      error: () => cb(vehicleId),
    });
  }

  private add(type: LogType, message: string): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.entries.unshift({ time, type, message });
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.length = MAX_ENTRIES;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
