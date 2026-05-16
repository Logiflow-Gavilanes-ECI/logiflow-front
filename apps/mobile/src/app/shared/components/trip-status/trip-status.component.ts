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

  emitStart(): void {
    if (this.isStartDisabled() || this.isProcessing) return;
    this.triggerWithLoader(TripStatusConstants.inTransit);
  }

  emitArrived(): void {
    if (this.isArrivedDisabled() || this.isProcessing) return;
    this.triggerWithLoader(TripStatusConstants.atStop);
  }

  emitDelivered(): void {
    if (this.isDeliveredDisabled() || this.isProcessing) return;
    this.triggerWithLoader(TripStatusConstants.delivered);
  }

  isStartDisabled(): boolean {
    return this.currentStatus === TripStatusConstants.inTransit;
  }

  isArrivedDisabled(): boolean {
    return this.currentStatus !== TripStatusConstants.inTransit;
  }

  isDeliveredDisabled(): boolean {
    return this.currentStatus !== TripStatusConstants.atStop;
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
