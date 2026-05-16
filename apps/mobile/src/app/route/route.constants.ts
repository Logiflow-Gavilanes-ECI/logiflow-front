import { ROUTE_STEP_STATUS, type RouteStepStatus } from '@logiflow/shared-models';

export const RoutePageConstants = {
  DefaultZoom: 13,
  SelectedStopZoom: 15,
  MarkerBounceDurationMs: 1400,
  MapHeightVh: 55,
  ListHeightVh: 45,
  PolylineStrokeColor: '#229ED9',
  PolylineStrokeOpacity: 0.8,
  PolylineStrokeWeight: 3,
} as const;

export const MapStyleConstants = {
  FallbackLatitude: 4.711,
  FallbackLongitude: -74.072,
  MarkerStrokeColor: '#1F2937',
} as const;

export const MarkerColorConstants: Record<RouteStepStatus, string> = {
  [ROUTE_STEP_STATUS.Pending]: '#808080',
  [ROUTE_STEP_STATUS.Active]: '#229ED9',
  [ROUTE_STEP_STATUS.Completed]: '#22C55E',
} as const;

export const RouteStatusLabelConstants: Record<RouteStepStatus, string> = {
  [ROUTE_STEP_STATUS.Pending]: 'Pending',
  [ROUTE_STEP_STATUS.Active]: 'Active',
  [ROUTE_STEP_STATUS.Completed]: 'Delivered',
} as const;

export const RouteApiConstants = {
  DriverRoutePathTemplate: '/vehicles/{vehicleId}/route',
} as const;

export const DarkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b949e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2a3a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d3f56' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#00e5ff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#229ed9' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d2016' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#22c55e' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
];
