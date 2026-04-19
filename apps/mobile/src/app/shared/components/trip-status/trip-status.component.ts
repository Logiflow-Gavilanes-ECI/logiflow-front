import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
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
  imports: [CommonModule, IonButton, IonIcon, IonSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripStatusComponent {
  @Input() currentStatus: TripStatus | null = null;
  @Output() readonly statusChange = new EventEmitter<TripStatus>();

  readonly tripStatusDisplayConstants = TripStatusDisplayConstants;
  readonly tripStatusConstants = TripStatusConstants;
  readonly statusIconConstants = StatusIconConstants;

  isProcessing = false;
  pendingStatus: TripStatus | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  emitIniciar(): void {
    if (this.isIniciarDisabled() || this.isProcessing) return;
    this.triggerWithLoader(TripStatusConstants.enCamino);
  }

  emitLlegue(): void {
    if (this.isLlegueDisabled() || this.isProcessing) return;
    this.triggerWithLoader(TripStatusConstants.enParada);
  }

  emitEntregue(): void {
    if (this.isEntregueDisabled() || this.isProcessing) return;
    this.triggerWithLoader(TripStatusConstants.entregado);
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

  private triggerWithLoader(status: TripStatus): void {
    this.isProcessing = true;
    this.pendingStatus = status;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.isProcessing = false;
      this.pendingStatus = null;
      this.statusChange.emit(status);
      this.cdr.markForCheck();
    }, 350);
  }
}
