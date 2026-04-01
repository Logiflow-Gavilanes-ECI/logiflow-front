import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonBadge,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  ToastController,
  IonToolbar,
} from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MapsService } from '@logiflow/shared-maps';
import { type DriverRoute, type RouteStep } from '@logiflow/shared-models';
import { RouteService } from '../core/services/route.service';
import { DriverSocketService } from '../core/services/driver-socket.service';
import {
  MarkerColorConstants,
  MapStyleConstants,
  RoutePageConstants,
  RouteStatusLabelConstants,
} from './route.constants';
import { mergeRouteUpdate } from './route.utils';
import { environment } from '../../environments/environment';
import { NavIconConstants, StatusIconConstants } from '../core/constants/icons.constants';
import {
  TripStatusDisplayConstants,
  type TripStatus,
} from '../core/constants/trip-status.constants';

interface RouteStatusDisplay {
  label: string;
  color: string;
  icon: string;
}

const NeutralRouteStatusDisplay: RouteStatusDisplay = {
  label: 'Ruta asignada',
  color: 'medium',
  icon: NavIconConstants.route,
};

@Component({
  selector: 'logiflow-route-page',
  standalone: true,
  templateUrl: './route.page.html',
  styleUrls: ['./route.page.scss'],
  imports: [
    CommonModule,
    IonBadge,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePage implements AfterViewInit {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainerRef!: ElementRef<HTMLDivElement>;

  readonly routeSteps: RouteStep[] = [];
  readonly routeIconName = NavIconConstants.route;
  currentStatus: TripStatus | null = null;

  private readonly routeService = inject(RouteService);
  private readonly mapsService = inject(MapsService);
  private readonly driverSocketService = inject(DriverSocketService);
  private readonly toastController = inject(ToastController);

  private readonly markerByStopId = new Map<string, google.maps.Marker>();
  private mapInstance: google.maps.Map | null = null;
  private routePolyline: google.maps.Polyline | null = null;
  private currentRoute: DriverRoute | null = null;
  private markerBounceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.subscribeToSocketRouteUpdates();
  }

  ionViewWillEnter(): void {
    void this.loadAndRenderRoute();
  }

  ngAfterViewInit(): void {
    void this.initializeMapAfterViewInit();
  }

  centerMapOnStop(step: RouteStep): void {
    if (!this.mapInstance) {
      return;
    }

    this.mapInstance.panTo({ lat: step.lat, lng: step.lng });
    this.mapInstance.setZoom(RoutePageConstants.SelectedStopZoom);
    this.animateStopMarker(step.stopId);
  }

  getStatusLabel(step: RouteStep): string {
    return RouteStatusLabelConstants[step.status];
  }

  getStatusColor(step: RouteStep): string {
    return MarkerColorConstants[step.status];
  }

  getStatusIcon(step: RouteStep): string {
    if (step.status === 'completed') {
      return StatusIconConstants.completed;
    }

    if (step.status === 'active') {
      return StatusIconConstants.enCamino;
    }

    return StatusIconConstants.pending;
  }

  get currentStatusDisplay(): RouteStatusDisplay {
    if (!this.currentStatus) {
      return NeutralRouteStatusDisplay;
    }

    return TripStatusDisplayConstants[this.currentStatus];
  }

  private async loadDriverRoute(): Promise<DriverRoute> {
    return this.routeService.getDriverRoute();
  }

  private async initializeMapAfterViewInit(): Promise<void> {
    await this.mapsService.loadGoogleMapsApi(environment.googleMapsApiKey);
    this.ensureMapInitialized();
    this.renderRoute();
  }

  private async loadAndRenderRoute(): Promise<void> {
    try {
      const route = await this.loadDriverRoute();
      this.updateRouteState(route);
      this.driverSocketService.connect(route.vehicleId);
      this.renderRoute();
    } catch {
      this.updateRouteState({ vehicleId: '', steps: [] });
      this.renderRoute();
    }
  }

  private subscribeToSocketRouteUpdates(): void {
    this.driverSocketService.routeUpdate$
      .pipe(takeUntilDestroyed())
      .subscribe(this.handleIncomingRouteUpdate.bind(this));
  }

  private async handleIncomingRouteUpdate(newRoute: DriverRoute): Promise<void> {
    await this.showRouteUpdateToast();
    this.applyRouteUpdate(newRoute);
  }

  private applyRouteUpdate(newRoute: DriverRoute): void {
    const mergedSteps = mergeRouteUpdate(this.routeSteps, newRoute.steps);

    this.clearRoutePolyline();
    this.clearMarkers();

    this.currentRoute = {
      vehicleId: newRoute.vehicleId,
      steps: [...mergedSteps].sort(compareRouteStepsByArrivalOrder),
    };

    this.routeSteps.splice(0, this.routeSteps.length, ...this.currentRoute.steps);

    if (!this.mapInstance || this.currentRoute.steps.length === 0) {
      return;
    }

    const firstStep = this.currentRoute.steps[0];
    this.mapInstance.setCenter({ lat: firstStep.lat, lng: firstStep.lng });
    this.mapInstance.setZoom(RoutePageConstants.DefaultZoom);
    this.renderMarkers(this.currentRoute.steps);
    this.renderOrderedPolyline(this.currentRoute.steps);
  }

  private async showRouteUpdateToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Your route has been updated by the dispatcher.',
      duration: 3000,
      position: 'top',
      color: 'primary',
      buttons: [{ text: 'View', role: 'info' }],
    });

    await toast.present();
  }

  private updateRouteState(route: DriverRoute): void {
    this.currentRoute = {
      vehicleId: route.vehicleId,
      steps: [...route.steps].sort(compareRouteStepsByArrivalOrder),
    };

    this.routeSteps.splice(0, this.routeSteps.length, ...this.currentRoute.steps);
  }

  private ensureMapInitialized(): void {
    if (this.mapInstance) {
      return;
    }

    const firstStep = this.currentRoute?.steps[0];
    this.mapInstance = this.mapsService.createMap(this.mapContainerRef.nativeElement, {
      center: firstStep
        ? { lat: firstStep.lat, lng: firstStep.lng }
        : { lat: MapStyleConstants.FallbackLatitude, lng: MapStyleConstants.FallbackLongitude },
      zoom: RoutePageConstants.DefaultZoom,
      mapTypeControl: false,
      streetViewControl: false,
    });
  }

  private renderRoute(): void {
    if (!this.mapInstance || !this.currentRoute?.steps.length) {
      return;
    }

    const firstStep = this.currentRoute.steps[0];
    this.mapInstance.setCenter({ lat: firstStep.lat, lng: firstStep.lng });
    this.mapInstance.setZoom(RoutePageConstants.DefaultZoom);

    this.clearMarkers();
    this.clearRoutePolyline();
    this.renderMarkers(this.currentRoute.steps);
    this.renderOrderedPolyline(this.currentRoute.steps);
  }

  private renderMarkers(steps: RouteStep[]): void {
    for (const step of steps) {
      const marker = new google.maps.Marker({
        map: this.mapInstance,
        position: { lat: step.lat, lng: step.lng },
        label: step.arrivalOrder.toString(),
        icon: this.buildMarkerIcon(step),
      });

      this.markerByStopId.set(step.stopId, marker);
    }
  }

  private buildMarkerIcon(step: RouteStep): google.maps.Symbol {
    return {
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      scale: 6,
      fillColor: MarkerColorConstants[step.status],
      fillOpacity: 1,
      strokeColor: MapStyleConstants.MarkerStrokeColor,
      strokeWeight: 1,
    };
  }

  private clearMarkers(): void {
    for (const marker of this.markerByStopId.values()) {
      marker.setMap(null);
    }

    this.markerByStopId.clear();
  }

  private renderOrderedPolyline(steps: RouteStep[]): void {
    const sortedSteps = [...steps].sort(compareRouteStepsByArrivalOrder);
    const routePath = sortedSteps.map(mapStepToLatLngLiteral);

    this.routePolyline = new google.maps.Polyline({
      map: this.mapInstance,
      path: routePath,
      strokeColor: RoutePageConstants.PolylineStrokeColor,
      strokeOpacity: RoutePageConstants.PolylineStrokeOpacity,
      strokeWeight: RoutePageConstants.PolylineStrokeWeight,
    });
  }

  private clearRoutePolyline(): void {
    if (!this.routePolyline) {
      return;
    }

    this.routePolyline.setMap(null);
    this.routePolyline = null;
  }

  private animateStopMarker(stopId: string): void {
    const marker = this.markerByStopId.get(stopId);
    if (!marker) {
      return;
    }

    if (this.markerBounceTimeoutId !== null) {
      clearTimeout(this.markerBounceTimeoutId);
      this.markerBounceTimeoutId = null;
    }

    marker.setAnimation(google.maps.Animation.BOUNCE);
    this.markerBounceTimeoutId = setTimeout(
      stopMarkerBounceAnimation,
      RoutePageConstants.MarkerBounceDurationMs,
      marker,
    );
  }
}

function compareRouteStepsByArrivalOrder(left: RouteStep, right: RouteStep): number {
  return left.arrivalOrder - right.arrivalOrder;
}

function mapStepToLatLngLiteral(step: RouteStep): google.maps.LatLngLiteral {
  return { lat: step.lat, lng: step.lng };
}

function stopMarkerBounceAnimation(marker: google.maps.Marker): void {
  marker.setAnimation(null);
}
