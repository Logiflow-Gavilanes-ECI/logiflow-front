import { Component, ViewChild } from '@angular/core';
import { MapComponent } from '../map/map.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  @ViewChild('mapRef') mapComponent!: MapComponent;

  onVehicleClicked(vehicleId: string): void {
    this.mapComponent?.focusVehicle(vehicleId);
  }
}
