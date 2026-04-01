import { ROUTE_STEP_STATUS, type RouteStepStatus } from '@logiflow/shared-models';

export const RoutePageConstants = {
  DefaultZoom: 13,
  MapHeightVh: 55,
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

export const RouteApiConstants = {
  DriverRoutePathTemplate: '/vehicles/{vehicleId}/route',
} as const;

export const RouteJwtClaimConstants = {
  VehicleId: 'vehicleId',
} as const;
