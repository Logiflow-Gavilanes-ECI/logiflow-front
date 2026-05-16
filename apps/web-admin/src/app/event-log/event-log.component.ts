import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../core/services/socket.service';
import { VehicleApiService } from '../core/services/vehicle-api.service';
import type { VehicleDriverStatusEvent } from '@logiflow/shared-socket';

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
        this.add('position', `${data.vehicleId} → ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)} · ${data.speed} km/h`);
      }),
      this.socketService.onRouteUpdate().subscribe((data) => {
        const eta = data.estimatedTime ? `, ${data.estimatedTime} min` : '';
        this.add('route', `Route for ${data.vehicleId} → ${data.stops.length} stops${eta}`);
      }),
      this.socketService.onVehicleOffline().subscribe((data) => {
        this.add('offline', `⚠ ${data.vehicleId} NO SIGNAL`);
      }),
      this.socketService.onVehicleOnline().subscribe((data) => {
        this.add('system', `✓ ${data.vehicleId} reconnected`);
      }),
      this.socketService.onDriverStatus().subscribe((data) => {
        this.logStatusWithPlate(data);
      }),
    );
  }

  private logStatusWithPlate(data: VehicleDriverStatusEvent): void {
    const iconMap: Record<string, string> = { DELIVERED: '📦', ARRIVED: '📍', START: '🚗' };
    const icon = iconMap[data.status] ?? '🔔';
    const stop = data.stopId ? ` · ${data.stopId}` : '';

    const cached = this.plateCache[data.vehicleId];
    if (cached) {
      this.add('status', `${icon} ${cached} → ${data.status}${stop}`);
      return;
    }

    this.vehicleApi.getOne(data.vehicleId).subscribe({
      next: (v) => {
        this.plateCache[data.vehicleId] = v.plate;
        this.add('status', `${icon} ${v.plate} → ${data.status}${stop}`);
      },
      error: () => {
        this.add('status', `${icon} ${data.vehicleId.slice(0, 8)} → ${data.status}${stop}`);
      },
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
