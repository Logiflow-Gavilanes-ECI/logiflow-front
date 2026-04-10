import { Injectable } from '@angular/core';

export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const aa =
    sinDLat * sinDLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return EARTH_RADIUS_KM * c;
}

export function totalPolylineDistanceKm(points: Coordinates[]): number {
  if (points.length < 2) {
    return 0;
  }

  return points.slice(1).reduce((acc, point, index) => {
    return acc + haversineDistanceKm(points[index], point);
  }, 0);
}

export function toGoogleLatLngLiteral(point: Coordinates): { lat: number; lng: number } {
  return { lat: point.lat, lng: point.lng };
}

@Injectable({ providedIn: 'root' })
export class MapsService {
  private loadingPromise: Promise<void> | null = null;

  loadGoogleMapsApi(apiKey: string): Promise<void> {
    if (this.isGoogleMapsAvailable()) {
      return Promise.resolve();
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise<void>((resolve, reject) => {
      const callbackName = `logiflowMapsInit_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const globalAny = globalThis as Record<string, unknown>;

      function cleanup(): void {
        delete globalAny[callbackName];
        script.remove();
      }

      globalAny[callbackName] = function onGoogleMapsLoaded() {
        cleanup();
        resolve();
      };

      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = function onGoogleMapsLoadError() {
        cleanup();
        reject(new Error('Unable to load Google Maps JavaScript API.'));
      };

      document.head.appendChild(script);
    }).finally(() => {
      this.loadingPromise = null;
    });

    return this.loadingPromise;
  }

  createMap(
    mapElement: HTMLElement,
    options: google.maps.MapOptions,
  ): google.maps.Map {
    return new google.maps.Map(mapElement, options);
  }

  private isGoogleMapsAvailable(): boolean {
    const typedWindow = globalThis.window as Window & { google?: unknown };
    return typedWindow.google !== undefined;
  }
}
