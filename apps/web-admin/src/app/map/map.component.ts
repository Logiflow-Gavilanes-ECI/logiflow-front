import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../core/services/socket.service';
import { VehicleApiService, type VehicleRecord } from '../core/services/vehicle-api.service';
import { environment } from '../../environments/environment';
import type { VehiclePositionEvent, RouteUpdateEvent, VehicleStatusEvent } from '@logiflow/shared-models';

interface RouteToastData {
  vehicleId: string;
  stops: number;
  eta: number | null;
  distance: number | null;
  eventType: string | null;
}

interface VehicleData {
  lat: number;
  lng: number;
  speed: number;
  isOffline: boolean;
  prevLat?: number;
  prevLng?: number;
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
  private readonly vehicleData: Record<string, VehicleData> = {};
  private readonly subscriptions: Subscription[] = [];
  private readonly offlineTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  private activeInfoWindow: google.maps.InfoWindow | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly OFFLINE_GRACE_MS = 15_000;

  toastVisible = false;
  toastData: RouteToastData | null = null;
  isLoading = true;

  private readonly vehicleCache: Record<string, VehicleRecord> = {};

  constructor(
    private readonly socketService: SocketService,
    private readonly vehicleApi: VehicleApiService,
  ) {}

  ngOnInit(): void {
    this.loadingTimer = setTimeout(() => this.stopLoading(), 8000);

    this.loadGoogleMaps().then(() => {
      this.initMap();
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

  private injectInfoWindowStyles(): void {
    if (document.getElementById('lf-iw-styles')) return;
    const style = document.createElement('style');
    style.id = 'lf-iw-styles';
    style.textContent = `
      .gm-style-iw-c { background: transparent !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
      .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
      .gm-style-iw-t::after { display: none !important; }
      .gm-style-iw-tc { display: none !important; }
      .gm-ui-hover-effect { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  private initMap(): void {
    this.injectInfoWindowStyles();
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
        this.cancelOfflineTimer(data.vehicleId);
        this.updateOrCreateMarker(data.vehicleId, data.lat, data.lng, false, data.speed);
        this.fitAllVehicles();
      }),
      this.socketService.onRouteUpdate().subscribe((data: RouteUpdateEvent) => {
        const fromPolyline = (data.polyline ?? [])
          .map((p) => ({ lat: (p as unknown as { lat: number }).lat, lng: (p as unknown as { lng: number }).lng }))
          .filter((p) => p.lat && p.lng);
        const fromStops = (data.stops ?? [])
          .slice()
          .sort((a, b) => ((a as unknown as { order?: number }).order ?? 0) - ((b as unknown as { order?: number }).order ?? 0))
          .map((s) => ({ lat: s.lat, lng: s.lng }));
        const points = fromPolyline.length ? fromPolyline : fromStops;
        this.drawStreetFollowingPolyline(data.vehicleId, points, true);
        this.showRouteToast(data);
      }),
      this.socketService.onVehicleOffline().subscribe((data: VehicleStatusEvent) => {
        if (this.offlineTimers[data.vehicleId]) return;
        this.offlineTimers[data.vehicleId] = setTimeout(() => {
          delete this.offlineTimers[data.vehicleId];
          this.updateOrCreateMarker(data.vehicleId, null, null, true);
        }, MapComponent.OFFLINE_GRACE_MS);
      }),
      this.socketService.onVehicleOnline().subscribe((data: VehicleStatusEvent) => {
        this.cancelOfflineTimer(data.vehicleId);
        this.updateOrCreateMarker(data.vehicleId, null, null, false);
      }),
    );
  }

  private buildMarkerIcon(isOffline: boolean, rotation = 0, scale = 6): google.maps.Symbol {
    const color = isOffline ? '#ff1744' : '#00e5ff';
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: isOffline ? '#ff1744' : '#004d5a',
      strokeWeight: 2,
      rotation,
    };
  }

  private updateOrCreateMarker(vehicleId: string, lat: number | null, lng: number | null, isOffline: boolean, speed?: number): void {
    const prev = this.vehicleData[vehicleId];
    const newLat = lat ?? prev?.lat ?? 0;
    const newLng = lng ?? prev?.lng ?? 0;
    const rotation = (prev?.lat && prev?.lng && lat && lng)
      ? calculateBearing({ lat: prev.lat, lng: prev.lng }, { lat, lng })
      : 0;

    this.vehicleData[vehicleId] = {
      lat: newLat,
      lng: newLng,
      speed: speed ?? prev?.speed ?? 0,
      isOffline,
      prevLat: prev?.lat,
      prevLng: prev?.lng,
    };

    if (this.markers[vehicleId]) {
      if (lat !== null && lng !== null) {
        this.markers[vehicleId].setPosition({ lat, lng });
      }
      this.markers[vehicleId].setIcon(this.buildMarkerIcon(isOffline, rotation));
    } else {
      if (lat === null || lng === null) return;
      const label = this.vehicleCache[vehicleId]?.plate ?? '...';
      this.markers[vehicleId] = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: vehicleId,
        icon: this.buildMarkerIcon(isOffline),
        label: { text: label, color: '#e8edf5', fontSize: '10px', fontFamily: 'Space Mono' },
      });
      this.markers[vehicleId].addListener('click', () => this.openInfoWindow(vehicleId));

      this.vehicleApi.getOne(vehicleId).subscribe({
        next: (vehicle) => {
          this.vehicleCache[vehicleId] = vehicle;
          this.markers[vehicleId]?.setLabel({ text: vehicle.plate, color: '#e8edf5', fontSize: '10px', fontFamily: 'Space Mono' });
        },
      });
    }
  }

  private openInfoWindow(vehicleId: string): void {
    if (this.activeInfoWindow) this.activeInfoWindow.close();

    const data = this.vehicleData[vehicleId];
    const marker = this.markers[vehicleId];
    if (!data || !marker) return;

    const cached = this.vehicleCache[vehicleId];
    if (cached) {
      this.renderInfoWindow(data, marker, cached);
    } else {
      this.vehicleApi.getOne(vehicleId).subscribe({
        next: (vehicle) => {
          this.vehicleCache[vehicleId] = vehicle;
          this.renderInfoWindow(data, marker, vehicle);
        },
        error: () => this.renderInfoWindow(data, marker, null),
      });
    }
  }

  private renderInfoWindow(data: VehicleData, marker: google.maps.Marker, vehicle: VehicleRecord | null): void {
    const statusLabel = data.isOffline ? 'OFFLINE' : 'ONLINE';
    const statusColor = data.isOffline ? '#ef4444' : '#22c55e';
    const pulseCss   = data.isOffline ? '' : 'animation:lf-pulse 2s infinite;';
    const plate = vehicle?.plate ?? '—';
    const model = vehicle?.model ?? '—';

    const content = `
      <style>
        @keyframes lf-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.5; transform:scale(1.4); }
        }
      </style>
      <div style="
        font-family:'Space Mono',monospace;
        background:linear-gradient(145deg,#0d1420,#111827);
        border:1px solid #1e2d45;
        border-radius:12px;
        padding:16px 18px 14px;
        min-width:210px;
        position:relative;
        box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(0,229,255,.08);
      ">
        <button id="lf-iw-close" style="
          position:absolute;top:10px;right:10px;
          background:rgba(255,255,255,.06);border:none;border-radius:50%;
          width:22px;height:22px;cursor:pointer;
          color:#64748b;font-size:14px;line-height:22px;text-align:center;
          transition:background .15s;
        " onmouseover="this.style.background='rgba(255,255,255,.14)'"
           onmouseout="this.style.background='rgba(255,255,255,.06)'">✕</button>

        <div style="font-size:17px;font-weight:700;color:#00e5ff;letter-spacing:2.5px;margin-bottom:3px;padding-right:28px;">${plate}</div>
        <div style="font-size:11px;color:#4a6080;margin-bottom:12px;letter-spacing:.5px;">${model}</div>

        <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block;flex-shrink:0;${pulseCss}"></span>
          <span style="font-size:10px;color:${statusColor};letter-spacing:1.5px;font-weight:700;">${statusLabel}</span>
        </div>

        <div style="border-top:1px solid #1a2d40;padding-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;">
          <div style="font-size:10px;color:#4a6080;">LAT</div>
          <div style="font-size:10px;color:#4a6080;">LNG</div>
          <div style="font-size:11px;color:#e2e8f0;font-weight:600;">${data.lat.toFixed(4)}</div>
          <div style="font-size:11px;color:#e2e8f0;font-weight:600;">${data.lng.toFixed(4)}</div>
          <div style="font-size:10px;color:#4a6080;margin-top:4px;">VELOCIDAD</div>
          <div></div>
          <div style="font-size:11px;color:#e2e8f0;font-weight:600;">${data.speed} km/h</div>
        </div>
      </div>`;

    this.activeInfoWindow = new google.maps.InfoWindow({ content, disableAutoPan: false });
    this.activeInfoWindow.open(this.map, marker);
    this.map.panTo(marker.getPosition()!);

    setTimeout(() => {
      document.getElementById('lf-iw-close')?.addEventListener('click', () => {
        this.activeInfoWindow?.close();
        this.activeInfoWindow = null;
      });
    }, 0);
  }

  focusVehicle(vehicleId: string): void {
    const marker = this.markers[vehicleId];
    if (!marker) return;
    const pos = marker.getPosition();
    if (pos) this.map.panTo(pos);
    this.map.setZoom(16);
    this.openInfoWindow(vehicleId);
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

  private drawStreetFollowingPolyline(vehicleId: string, points: google.maps.LatLngLiteral[], flash = false): void {
    this.polylines[vehicleId]?.setMap(null);
    if (points.length < 2) return;

    const origin = points[0];
    const destination = points[points.length - 1];
    const waypoints = points.slice(1, -1).map((p) => ({ location: p, stopover: true }));

    new google.maps.DirectionsService().route(
      { origin, destination, waypoints, travelMode: google.maps.TravelMode.DRIVING, optimizeWaypoints: false },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          this.polylines[vehicleId] = new google.maps.Polyline({
            path: result.routes[0].overview_path,
            geodesic: true,
            strokeColor: '#ff6b35',
            strokeOpacity: 0.9,
            strokeWeight: 3,
            map: this.map,
          });
          if (flash) this.flashPolyline(vehicleId);
        } else {
          this.drawPolyline(vehicleId, points);
        }
      },
    );
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

  fitAllVehicles(): void {
    const positions = Object.values(this.vehicleData)
      .filter((v) => !v.isOffline && v.lat && v.lng);
    if (!positions.length) return;
    if (positions.length === 1) {
      this.map.panTo({ lat: positions[0].lat, lng: positions[0].lng });
      this.map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    positions.forEach((v) => bounds.extend({ lat: v.lat, lng: v.lng }));
    this.map.fitBounds(bounds, 80);
  }

  resetMapView(): void {
    this.map.panTo({ lat: 4.711, lng: -74.0721 });
    this.map.setZoom(13);
  }

  private cancelOfflineTimer(vehicleId: string): void {
    if (this.offlineTimers[vehicleId]) {
      clearTimeout(this.offlineTimers[vehicleId]);
      delete this.offlineTimers[vehicleId];
    }
  }

  private flashPolyline(vehicleId: string): void {
    const line = this.polylines[vehicleId];
    if (!line) return;
    line.setOptions({ strokeColor: '#ffffff', strokeWeight: 5 });
    setTimeout(() => line.setOptions({ strokeColor: '#ff6b35', strokeWeight: 3 }), 1500);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.loadingTimer) clearTimeout(this.loadingTimer);
    Object.values(this.offlineTimers).forEach((t) => clearTimeout(t));
  }
}

function calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
