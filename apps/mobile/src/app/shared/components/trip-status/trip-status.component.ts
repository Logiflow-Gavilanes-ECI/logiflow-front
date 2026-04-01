import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { StatusIconConstants } from '../../../core/constants/icons.constants';
import {
  TripStatusConstants,
  type TripStatus,
  TripStatusDisplayConstants,
} from '../../../core/constants/trip-status.constants';

@Component({
  selector: 'logiflow-trip-status',
  standalone: true,
  templateUrl: './trip-status.component.html',
  styleUrls: ['./trip-status.component.scss'],
  imports: [CommonModule, IonButton, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripStatusComponent {
  @Input() currentStatus: TripStatus | null = null;
  @Output() readonly statusChange = new EventEmitter<TripStatus>();

  readonly tripStatusDisplayConstants = TripStatusDisplayConstants;
  readonly tripStatusConstants = TripStatusConstants;
  readonly statusIconConstants = StatusIconConstants;

  emitIniciar(): void {
    if (this.isIniciarDisabled()) {
      return;
    }

    this.statusChange.emit(TripStatusConstants.enCamino);
  }

  emitLlegue(): void {
    if (this.isLlegueDisabled()) {
      return;
    }

    this.statusChange.emit(TripStatusConstants.enParada);
  }

  emitEntregue(): void {
    if (this.isEntregueDisabled()) {
      return;
    }

    this.statusChange.emit(TripStatusConstants.entregado);
  }

  isIniciarDisabled(): boolean {
    return this.currentStatus === TripStatusConstants.enCamino;
  }

  isLlegueDisabled(): boolean {
    return this.currentStatus !== TripStatusConstants.enCamino;
  }

  isEntregueDisabled(): boolean {
    return this.currentStatus !== TripStatusConstants.enParada;
  }
}
