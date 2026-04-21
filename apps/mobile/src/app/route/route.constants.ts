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
