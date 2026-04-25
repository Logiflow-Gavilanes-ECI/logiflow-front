import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../core/services/socket.service';

type LogType = 'system' | 'position' | 'route' | 'offline';

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

  constructor(private readonly socketService: SocketService) {}

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
    );
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
