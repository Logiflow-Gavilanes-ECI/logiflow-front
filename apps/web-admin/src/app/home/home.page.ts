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
    this.subscriptions.push(
      this.socketService.onDisconnect().subscribe(() => {
        this.socketError = true;
      }),
      this.socketService.onJoined().subscribe(() => {
        this.socketError = false;
      }),
    );
  }

  onVehicleClicked(vehicleId: string): void {
    this.mapComponent?.focusVehicle(vehicleId);
  }

  reconnect(): void {
    this.socketService.reconnect(environment.realtimeUrl);
    this.socketService.joinFleet();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
