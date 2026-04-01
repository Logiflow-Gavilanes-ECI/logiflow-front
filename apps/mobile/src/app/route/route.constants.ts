export const RoutePageConstants = {
  DefaultZoom: 13,
  MapHeightVh: 55,
} as const;

export const MapStyleConstants = {
  FallbackLatitude: 4.711,
  FallbackLongitude: -74.072,
} as const;

export const RouteApiConstants = {
  DriverRoutePathTemplate: '/vehicles/{vehicleId}/route',
} as const;

export const RouteJwtClaimConstants = {
  VehicleId: 'vehicleId',
} as const;
