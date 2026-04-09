import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { MapComponent } from '../map/map.component';
import { SocketService } from '../core/services/socket.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('mapRef') mapComponent!: MapComponent;

  socketError = false;

  private readonly subscriptions: Subscription[] = [];

  constructor(private readonly socketService: SocketService) {}

  ngOnInit(): void {
    this.socketService.connect();
    this.socketService.joinFleet();

    this.subscriptions.push(
      this.socketService.onVehiclePosition().subscribe((event) => {
        if (!environment.production) console.log('[socket] vehicle:position', event);
      }),
      this.socketService.onRouteUpdate().subscribe((event) => {
        if (!environment.production) console.log('[socket] route:update', event);
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
        this.socketError = true;
      }),
      this.socketService.onJoined().subscribe((ack) => {
        if (!environment.production) console.log('[socket] joined room', ack);
        this.socketError = false;
      }),
    );
  }

  onVehicleClicked(vehicleId: string): void {
    this.mapComponent?.focusVehicle(vehicleId);
  }

  reconnect(): void {
    this.socketService.reconnect();
    this.socketService.joinFleet();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.socketService.disconnect();
  }
}
