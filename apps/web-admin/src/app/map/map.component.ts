import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../core/services/socket.service';
import { environment } from '../../environments/environment';
import type { VehiclePositionEvent, RouteUpdateEvent, VehicleStatusEvent } from '@logiflow/shared-models';

interface RouteToastData {
  vehicleId: string;
  stops: number;
  eta: number | null;
  distance: number | null;
  eventType: string | null;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: false,
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map!: google.maps.Map;
  private readonly markers: Record<string, google.maps.Marker> = {};
  private readonly polylines: Record<string, google.maps.Polyline> = {};
  private readonly subscriptions: Subscription[] = [];
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;

  toastVisible = false;
  toastData: RouteToastData | null = null;
  isLoading = true;

  constructor(private readonly socketService: SocketService) {}

  ngOnInit(): void {
    this.loadingTimer = setTimeout(() => this.stopLoading(), 8000);

    this.loadGoogleMaps().then(() => {
      this.initMap();
      this.socketService.connect();
      this.socketService.joinFleet();
      this.subscribeToEvents();
    });
  }

  private stopLoading(): void {
    if (!this.isLoading) return;
    this.isLoading = false;
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  }

  private loadGoogleMaps(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  private initMap(): void {
    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: { lat: 4.711, lng: -74.0721 },
      zoom: 13,
      styles: [
        { elementType: 'geometry',           stylers: [{ color: '#0d1420' }] },
        { elementType: 'labels.text.fill',   stylers: [{ color: '#4a5568' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#080c14' }] },
        { featureType: 'road',           elementType: 'geometry',        stylers: [{ color: '#1a2540' }] },
        { featureType: 'road',           elementType: 'geometry.stroke', stylers: [{ color: '#080c14' }] },
        { featureType: 'road.highway',   elementType: 'geometry',        stylers: [{ color: '#1f3060' }] },
        { featureType: 'water',          elementType: 'geometry',        stylers: [{ color: '#060a10' }] },
        { featureType: 'poi',            stylers: [{ visibility: 'off' }] },
        { featureType: 'transit',        stylers: [{ visibility: 'off' }] },
      ],
    });
  }

  private subscribeToEvents(): void {
    this.subscriptions.push(
      this.socketService.onVehiclePosition().subscribe((data: VehiclePositionEvent) => {
        this.stopLoading();
        this.updateOrCreateMarker(data.vehicleId, data.lat, data.lng, false);
      }),
      this.socketService.onRouteUpdate().subscribe((data: RouteUpdateEvent) => {
        const points = data.polyline.map((p) => ({ lat: (p as unknown as { lat: number }).lat, lng: (p as unknown as { lng: number }).lng }));
        this.drawPolyline(data.vehicleId, points);
        this.showRouteToast(data);
      }),
      this.socketService.onVehicleOffline().subscribe((data: VehicleStatusEvent) => {
        this.updateOrCreateMarker(data.vehicleId, null, null, true);
      }),
      this.socketService.onVehicleOnline().subscribe((data: VehicleStatusEvent) => {
        this.updateOrCreateMarker(data.vehicleId, null, null, false);
      }),
    );
  }

  private buildMarkerIcon(isOffline: boolean, scale = 6): google.maps.Symbol {
    const color = isOffline ? '#ff1744' : '#00e5ff';
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: isOffline ? '#ff1744' : '#004d5a',
      strokeWeight: 2,
    };
  }

  private updateOrCreateMarker(vehicleId: string, lat: number | null, lng: number | null, isOffline: boolean): void {
    if (this.markers[vehicleId]) {
      if (lat !== null && lng !== null) {
        this.markers[vehicleId].setPosition({ lat, lng });
      }
      this.markers[vehicleId].setIcon(this.buildMarkerIcon(isOffline));
    } else {
      if (lat === null || lng === null) return;
      this.markers[vehicleId] = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: vehicleId,
        icon: this.buildMarkerIcon(isOffline),
        label: { text: vehicleId, color: '#e8edf5', fontSize: '10px', fontFamily: 'Space Mono' },
      });
      this.markers[vehicleId].addListener('click', () => this.focusVehicle(vehicleId));
    }
  }

  focusVehicle(vehicleId: string): void {
    const marker = this.markers[vehicleId];
    if (!marker) return;
    const pos = marker.getPosition();
    if (pos) this.map.panTo(pos);
    this.map.setZoom(16);
  }

  private drawPolyline(vehicleId: string, points: google.maps.LatLngLiteral[]): void {
    this.polylines[vehicleId]?.setMap(null);
    if (!points.length) return;
    this.polylines[vehicleId] = new google.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: '#ff6b35',
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: this.map,
    });
  }

  private showRouteToast(data: RouteUpdateEvent): void {
    this.toastData = {
      vehicleId: data.vehicleId,
      stops: data.stops.length,
      eta: data.estimatedTime ?? null,
      distance: data.totalDistance ?? null,
      eventType: data.eventType ?? null,
    };
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 6000);
  }

  resetMapView(): void {
    this.map.panTo({ lat: 4.711, lng: -74.0721 });
    this.map.setZoom(13);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.socketService.disconnect();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.loadingTimer) clearTimeout(this.loadingTimer);
  }
}
