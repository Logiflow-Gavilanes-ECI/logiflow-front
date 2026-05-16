import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { HomePageRoutingModule } from './home-routing.module';
import { MapComponent } from '../map/map.component';
import { VehicleListComponent } from '../vehicle-list/vehicle-list.component';
import { EventLogComponent } from '../event-log/event-log.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
  ],
  declarations: [HomePage, MapComponent, VehicleListComponent, EventLogComponent],
})
export class HomePageModule {}
