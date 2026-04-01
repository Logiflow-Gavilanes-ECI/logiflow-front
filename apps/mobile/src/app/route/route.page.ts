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
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { MapsService } from '@logiflow/shared-maps';
import { type DriverRoute, type RouteStep } from '@logiflow/shared-models';
import { RouteService } from '../core/services/route.service';
import {
  MarkerColorConstants,
  MapStyleConstants,
  RoutePageConstants,
} from './route.constants';
import { environment } from '../../environments/environment';

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
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePage implements AfterViewInit {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainerRef!: ElementRef<HTMLDivElement>;

  readonly routeSteps: RouteStep[] = [];

  private readonly routeService = inject(RouteService);
  private readonly mapsService = inject(MapsService);

  private readonly markerByStopId = new Map<string, google.maps.Marker>();
  private mapInstance: google.maps.Map | null = null;
  private currentRoute: DriverRoute | null = null;

  ionViewWillEnter(): void {
    void this.loadAndRenderRoute();
  }

  ngAfterViewInit(): void {
    void this.initializeMapAfterViewInit();
  }

  centerMapOnStop(step: RouteStep): void {
    void step;
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
      this.renderRoute();
    } catch {
      this.updateRouteState({ vehicleId: '', steps: [] });
      this.renderRoute();
    }
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
    this.renderMarkers(this.currentRoute.steps);
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
}

function compareRouteStepsByArrivalOrder(left: RouteStep, right: RouteStep): number {
  return left.arrivalOrder - right.arrivalOrder;
}
