import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  mapOutline,
  navigateOutline,
  navigateCircleOutline,
  carOutline,
  locationOutline,
  checkmarkCircleOutline,
  ellipseOutline,
  alertCircleOutline,
  chevronUpOutline,
  chevronDownOutline,
  listOutline,
  notificationsOutline,
  personOutline,
  logOutOutline,
  wifiOutline,
  refreshOutline,
  closeOutline,
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MapsService } from '@logiflow/shared-maps';
import { type DriverRoute, type RouteStep } from '@logiflow/shared-models';
import { RouteService } from '../core/services/route.service';
import { DriverSocketService } from '../core/services/driver-socket.service';
import { PushNotificationService } from '../core/services/push-notification.service';
import { AuthService } from '../core/services/auth.service';
import { VehicleService, type VehicleDetails } from '../core/services/vehicle.service';
import {
  MarkerColorConstants,
  MapStyleConstants,
  RoutePageConstants,
  RouteStatusLabelConstants,
  DarkMapStyles,
} from './route.constants';
import { mergeRouteUpdate } from './route.utils';
import { environment } from '../../environments/environment';
import { NavIconConstants, StatusIconConstants } from '../core/constants/icons.constants';
import {
  TripStatusDisplayConstants,
  TripStatusConstants,
  type TripStatus,
} from '../core/constants/trip-status.constants';
import { TripStatusComponent } from '../shared/components/trip-status/trip-status.component';

type ActiveTab = 'map' | 'stops' | 'notifications' | 'profile';

interface RouteStatusDisplay {
  label: string;
  color: string;
  icon: string;
}

interface RouteAlert {
  message: string;
  time: string;
  stopsCount: number;
}

const NeutralRouteStatusDisplay: RouteStatusDisplay = {
  label: 'Route assigned',
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
    TripStatusComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePage implements AfterViewInit {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainerRef!: ElementRef<HTMLDivElement>;

  readonly routeSteps: RouteStep[] = [];
  readonly recentAlerts: RouteAlert[] = [];
  readonly tabTitles: Record<ActiveTab, string> = {
    map: 'Driver Route',
    stops: 'Delivery Stops',
    notifications: 'Alerts',
    profile: 'My Profile',
  };

  activeTab: ActiveTab = 'map';
  isPanelExpanded = false;
  socketError: string | null = null;
  currentStatus: TripStatus | null = null;
  unreadAlerts = 0;
  driverEmail = '';
  driverVehicleId = '';
  vehicleDetails: VehicleDetails | null = null;
  vehicleDetailsLoading = false;
  readonly completedDeliveries: RouteStep[] = [];

  get driverInitials(): string {
    if (!this.driverEmail) return '??';
    const parts = this.driverEmail.split('@')[0].split(/[._-]/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : this.driverEmail.slice(0, 2).toUpperCase();
  }

  private readonly routeService = inject(RouteService);
  private readonly mapsService = inject(MapsService);
  private readonly driverSocketService = inject(DriverSocketService);
  private readonly toastController = inject(ToastController);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly authService = inject(AuthService);
  private readonly vehicleService = inject(VehicleService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly markerByStopId = new Map<string, google.maps.Marker>();
  private mapInstance: google.maps.Map | null = null;
  private routePolyline: google.maps.Polyline | null = null;
  private currentRoute: DriverRoute | null = null;
  private markerBounceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private driverMarker: google.maps.Marker | null = null;
  private previousDriverPos: { lat: number; lng: number } | null = null;

  constructor() {
    addIcons({
      mapOutline, navigateOutline, navigateCircleOutline,
      carOutline, locationOutline, checkmarkCircleOutline,
      ellipseOutline, alertCircleOutline,
      chevronUpOutline, chevronDownOutline,
      listOutline, notificationsOutline, personOutline, logOutOutline,
      wifiOutline, refreshOutline, closeOutline,
    });
    this.subscribeToSocketRouteUpdates();
    this.subscribeToSocketErrors();
    this.subscribeToPositionUpdates();
  }

  ionViewWillEnter(): void {
    void this.loadAndRenderRoute();
    void this.pushNotificationService.initialize();
    void this.loadDriverProfile();
  }

  ionViewWillLeave(): void {
    this.driverSocketService.stopPositionTracking();
  }

  ngAfterViewInit(): void {
    void this.initializeMapAfterViewInit();
  }

  setTab(tab: ActiveTab): void {
    this.activeTab = tab;
    if (tab === 'notifications') {
      this.unreadAlerts = 0;
    }
    this.cdr.markForCheck();

    if (tab === 'map' && this.mapInstance) {
      setTimeout(() => {
        google.maps.event.trigger(this.mapInstance!, 'resize');
        this.renderRoute();
      }, 50);
    }
  }

  togglePanel(): void {
    this.isPanelExpanded = !this.isPanelExpanded;
    this.cdr.markForCheck();
  }

  centerOnDriver(): void {
    if (!this.mapInstance || !this.driverMarker) return;
    const pos = this.driverMarker.getPosition();
    if (pos) {
      this.mapInstance.panTo(pos);
      this.mapInstance.setZoom(17);
    }
  }

  centerMapOnStop(step: RouteStep): void {
    if (!this.mapInstance) return;
    this.mapInstance.panTo({ lat: step.lat, lng: step.lng });
    this.mapInstance.setZoom(RoutePageConstants.SelectedStopZoom);
    this.animateStopMarker(step.stopId);
  }

  centerMapOnStopAndCollapse(step: RouteStep): void {
    this.isPanelExpanded = false;
    this.cdr.markForCheck();
    this.centerMapOnStop(step);
  }

  centerMapOnStopAndGoToMap(step: RouteStep): void {
    this.setTab('map');
    setTimeout(() => this.centerMapOnStop(step), 100);
  }

  handleTripStatusChange(newStatus: TripStatus): void {
    this.currentStatus = newStatus;
    this.cdr.markForCheck();

    const vehicleId = this.currentRoute?.vehicleId ?? '';
    if (!vehicleId) return;

    const activeStop = this.getActiveStop();
    this.driverSocketService.emitStatusUpdate(vehicleId, newStatus, activeStop?.stopId ?? null);

    if (newStatus === TripStatusConstants.inTransit) {
      this.activateFirstPendingStop();
    } else if (newStatus === TripStatusConstants.delivered) {
      this.advanceActiveStopToNext();
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }

  async reconnect(): Promise<void> {
    this.socketError = null;
    this.cdr.markForCheck();
    await this.loadAndRenderRoute();
  }

  dismissSocketError(): void {
    this.socketError = null;
    this.cdr.markForCheck();
  }

  getStatusLabel(step: RouteStep): string { return RouteStatusLabelConstants[step.status]; }
  getStatusColor(step: RouteStep): string { return MarkerColorConstants[step.status]; }

  getStatusIcon(step: RouteStep): string {
    if (step.status === 'completed') return StatusIconConstants.completed;
    if (step.status === 'active') return StatusIconConstants.inTransit;
    return StatusIconConstants.pending;
  }

  isCompletedStep(step: RouteStep): boolean { return step.status === 'completed'; }
  isActiveStep(step: RouteStep): boolean { return step.status === 'active'; }

  get currentStatusDisplay(): RouteStatusDisplay {
    if (!this.currentStatus) return NeutralRouteStatusDisplay;
    return TripStatusDisplayConstants[this.currentStatus];
  }

  get completedCount(): number {
    return this.routeSteps.filter((s) => s.status === 'completed').length;
  }

  private async loadDriverProfile(): Promise<void> {
    const claims = await this.authService.getClaims();
    this.driverEmail = (claims?.['email'] as string) ?? '';
    this.driverVehicleId = (claims?.['vehicleId'] as string) ?? '';
    this.cdr.markForCheck();

    if (this.driverVehicleId) {
      await this.loadVehicleDetails(this.driverVehicleId);
    }
  }

  private async loadVehicleDetails(vehicleId: string): Promise<void> {
    this.vehicleDetailsLoading = true;
    this.cdr.markForCheck();
    this.vehicleDetails = await this.vehicleService.getVehicleDetails(vehicleId);
    this.vehicleDetailsLoading = false;
    this.cdr.markForCheck();
  }

  private async initializeMapAfterViewInit(): Promise<void> {
    await this.mapsService.loadGoogleMapsApi(environment.googleMapsApiKey);
    this.ensureMapInitialized();
    this.renderRoute();
  }

  private async loadAndRenderRoute(): Promise<void> {
    try {
      const route = await this.routeService.getDriverRoute();
      this.updateRouteState(route);
      await this.driverSocketService.connect(route.vehicleId);
      void this.driverSocketService.startPositionTracking(route.vehicleId);
      this.renderRoute();
    } catch (error) {
      const e = error as Record<string, unknown>;
      console.error(`[RoutePage] getDriverRoute failed — status: ${e?.['status']} url: ${e?.['url']} message: ${e?.['message']} error: ${JSON.stringify(e?.['error'])}`);
      this.updateRouteState({ vehicleId: '', steps: [] });
      this.renderRoute();
    }
  }

  private subscribeToPositionUpdates(): void {
    this.driverSocketService.position$
      .pipe(takeUntilDestroyed())
      .subscribe(({ lat, lng }) => this.updateDriverMarker(lat, lng));
  }

  private updateDriverMarker(lat: number, lng: number): void {
    if (!this.mapInstance) return;
    const pos = { lat, lng };
    const rotation = this.previousDriverPos ? calculateBearing(this.previousDriverPos, pos) : 0;
    this.previousDriverPos = pos;

    const icon: google.maps.Symbol = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 7,
      fillColor: '#00e5ff',
      fillOpacity: 1,
      strokeColor: '#004d5a',
      strokeWeight: 2,
      rotation,
    };

    if (this.driverMarker) {
      this.driverMarker.setPosition(pos);
      this.driverMarker.setIcon(icon);
    } else {
      this.driverMarker = new google.maps.Marker({
        map: this.mapInstance,
        position: pos,
        zIndex: 999,
        icon,
      });
    }

    if (this.activeTab === 'map') {
      this.mapInstance.panTo(pos);
    }
  }

  private subscribeToSocketErrors(): void {
    this.driverSocketService.error$
      .pipe(takeUntilDestroyed())
      .subscribe(async (message) => {
        if (message === 'Socket authentication failed.') {
          await this.authService.logout();
          await this.router.navigate(['/login']);
          return;
        }
        this.socketError = message;
        this.cdr.markForCheck();
      });
  }

  private subscribeToSocketRouteUpdates(): void {
    this.driverSocketService.routeUpdate$
      .pipe(takeUntilDestroyed())
      .subscribe(this.handleIncomingRouteUpdate.bind(this));
  }

  private async handleIncomingRouteUpdate(newRoute: DriverRoute): Promise<void> {
    await this.showRouteUpdateToast(newRoute.steps.length);
    this.addAlert(newRoute.steps.length);
    this.applyRouteUpdate(newRoute);
  }

  private addAlert(stopsCount: number): void {
    const now = new Date();
    const time = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    this.recentAlerts.unshift({ message: 'Route updated by dispatcher', time, stopsCount });
    if (this.activeTab !== 'notifications') {
      this.unreadAlerts++;
    }
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();

    if (!this.mapInstance || this.currentRoute.steps.length === 0) return;

    const firstStep = this.currentRoute.steps[0];
    this.mapInstance.setCenter({ lat: firstStep.lat, lng: firstStep.lng });
    this.mapInstance.setZoom(RoutePageConstants.DefaultZoom);
    this.renderMarkers(this.currentRoute.steps);
    this.renderStreetFollowingPolyline(this.currentRoute.steps);
  }

  private async showRouteUpdateToast(stopsCount: number): Promise<void> {
    const toast = await this.toastController.create({
      header: '🚚 Nueva ruta asignada',
      message: `${stopsCount} parada${stopsCount === 1 ? '' : 's'} · Toca para ver detalles`,
      duration: 5000,
      position: 'top',
      cssClass: 'route-update-toast',
      buttons: [
        { text: 'Ver', role: 'info', handler: () => { this.setTab('stops'); } },
        { icon: 'close-outline', role: 'cancel' },
      ],
    });
    await toast.present();
  }

  private updateRouteState(route: DriverRoute): void {
    this.currentRoute = {
      vehicleId: route.vehicleId,
      steps: [...route.steps].sort(compareRouteStepsByArrivalOrder),
    };
    this.routeSteps.splice(0, this.routeSteps.length, ...this.currentRoute.steps);
    this.cdr.markForCheck();
  }

  private ensureMapInitialized(): void {
    if (this.mapInstance) return;

    const firstStep = this.currentRoute?.steps[0];
    this.mapInstance = this.mapsService.createMap(this.mapContainerRef.nativeElement, {
      center: firstStep
        ? { lat: firstStep.lat, lng: firstStep.lng }
        : { lat: MapStyleConstants.FallbackLatitude, lng: MapStyleConstants.FallbackLongitude },
      zoom: RoutePageConstants.DefaultZoom,
      mapTypeControl: false,
      streetViewControl: false,
      styles: DarkMapStyles,
    });
  }

  private renderRoute(): void {
    if (!this.mapInstance || !this.currentRoute?.steps.length) return;

    const firstStep = this.currentRoute.steps[0];
    this.mapInstance.setCenter({ lat: firstStep.lat, lng: firstStep.lng });
    this.mapInstance.setZoom(RoutePageConstants.DefaultZoom);

    this.clearMarkers();
    this.clearRoutePolyline();
    this.renderMarkers(this.currentRoute.steps);
    this.renderStreetFollowingPolyline(this.currentRoute.steps);
  }

  private renderMarkers(steps: RouteStep[]): void {
    steps.forEach((step, index) => {
      const marker = new google.maps.Marker({
        map: this.mapInstance,
        position: { lat: step.lat, lng: step.lng },
        label: { text: (index + 1).toString(), color: '#ffffff', fontSize: '11px', fontWeight: 'bold' },
        icon: this.buildMarkerIcon(step),
      });
      this.markerByStopId.set(step.stopId, marker);
    });
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
    for (const marker of this.markerByStopId.values()) marker.setMap(null);
    this.markerByStopId.clear();
  }

  private renderOrderedPolyline(steps: RouteStep[]): void {
    const routePath = [...steps].sort(compareRouteStepsByArrivalOrder).map(mapStepToLatLngLiteral);
    this.routePolyline = new google.maps.Polyline({
      map: this.mapInstance,
      path: routePath,
      strokeColor: RoutePageConstants.PolylineStrokeColor,
      strokeOpacity: RoutePageConstants.PolylineStrokeOpacity,
      strokeWeight: RoutePageConstants.PolylineStrokeWeight,
    });
  }

  private renderStreetFollowingPolyline(steps: RouteStep[]): void {
    if (steps.length < 2) return;

    const sorted = [...steps].sort(compareRouteStepsByArrivalOrder);
    const origin = mapStepToLatLngLiteral(sorted[0]);
    const destination = mapStepToLatLngLiteral(sorted.at(-1)!);
    const waypoints = sorted.slice(1, -1).map((step) => ({
      location: mapStepToLatLngLiteral(step),
      stopover: true,
    }));

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      { origin, destination, waypoints, travelMode: google.maps.TravelMode.DRIVING, optimizeWaypoints: false },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          this.routePolyline = new google.maps.Polyline({
            map: this.mapInstance,
            path: result.routes[0].overview_path,
            strokeColor: RoutePageConstants.PolylineStrokeColor,
            strokeOpacity: RoutePageConstants.PolylineStrokeOpacity,
            strokeWeight: RoutePageConstants.PolylineStrokeWeight,
          });
        } else {
          console.warn('[RoutePage] DirectionsService failed (' + status + '), falling back to straight lines');
          this.renderOrderedPolyline(steps);
        }
      },
    );
  }

  private clearRoutePolyline(): void {
    if (!this.routePolyline) return;
    this.routePolyline.setMap(null);
    this.routePolyline = null;
  }

  private animateStopMarker(stopId: string): void {
    const marker = this.markerByStopId.get(stopId);
    if (!marker) return;

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

  private getActiveStop(): RouteStep | undefined {
    return this.routeSteps.find(isActiveRouteStep);
  }

  private activateFirstPendingStop(): void {
    const sortedSteps = [...this.routeSteps].sort(compareRouteStepsByArrivalOrder);
    const firstPending = sortedSteps.find(isPendingRouteStep);
    if (!firstPending) return;

    const updatedSteps = sortedSteps.map((step) =>
      step.stopId === firstPending.stopId ? { ...step, status: 'active' as const } : step,
    );

    this.currentRoute = { vehicleId: this.currentRoute?.vehicleId ?? '', steps: updatedSteps };
    this.routeSteps.splice(0, this.routeSteps.length, ...updatedSteps);
    this.cdr.markForCheck();
    this.renderRoute();
  }

  private advanceActiveStopToNext(): void {
    const sortedSteps = [...this.routeSteps].sort(compareRouteStepsByArrivalOrder);
    const activeIndex = sortedSteps.findIndex(isActiveRouteStep);
    if (activeIndex < 0) return;

    const activeStop = sortedSteps[activeIndex];
    const nextStep = sortedSteps.slice(activeIndex + 1).find(isPendingRouteStep);

    const updatedSteps = sortedSteps.map((step) => {
      if (step.stopId === activeStop.stopId) return { ...step, status: 'completed' as const };
      if (step.stopId === nextStep?.stopId) return { ...step, status: 'active' as const };
      return step;
    });

    if (!this.completedDeliveries.some((d) => d.stopId === activeStop.stopId)) {
      this.completedDeliveries.unshift({ ...activeStop, status: 'completed' });
    }

    this.currentRoute = { vehicleId: this.currentRoute?.vehicleId ?? '', steps: updatedSteps };
    this.routeSteps.splice(0, this.routeSteps.length, ...updatedSteps);
    this.cdr.markForCheck();
    this.renderRoute();

    if (nextStep && this.mapInstance) {
      this.setTab('map');
      setTimeout(() => {
        this.mapInstance!.panTo({ lat: nextStep.lat, lng: nextStep.lng });
        this.mapInstance!.setZoom(RoutePageConstants.SelectedStopZoom);
      }, 100);
    }
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
function isActiveRouteStep(step: RouteStep): boolean { return step.status === 'active'; }
function isPendingRouteStep(step: RouteStep): boolean { return step.status === 'pending'; }
function calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
