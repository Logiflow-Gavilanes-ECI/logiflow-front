export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Vehicle extends Coordinates {
  id: string;
  capacity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Stop extends Coordinates {
  id: string;
  demand: number;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehiclePositionEvent extends Coordinates {
  vehicleId: string;
  speed: number;
  timestamp: string;
}

export interface RouteStop {
  id: string;
  lat: number;
  lng: number;
  order?: number;
  type?: string;
}

export const ROUTE_STEP_STATUS = {
  Pending: 'pending',
  Active: 'active',
  Completed: 'completed',
} as const;

export type RouteStepStatus =
  (typeof ROUTE_STEP_STATUS)[keyof typeof ROUTE_STEP_STATUS];

export interface RouteStep {
  stopId: string;
  address: string;
  lat: number;
  lng: number;
  arrivalOrder: number;
  status: RouteStepStatus;
}

export interface DriverRoute {
  vehicleId: string;
  steps: RouteStep[];
}

export interface RouteUpdateEvent {
  vehicleId: string;
  stops: RouteStop[];
  polyline: string[];
  estimatedTime?: number;
  totalDistance?: number;
  eventType?: string;
  totalCost?: number;
  solvedAt?: string;
  timestamp: string;
}

export interface VehicleStatusEvent {
  vehicleId: string;
}

export interface JoinRoomAck {
  room: string;
}

export const SOCKET_EVENTS = {
  JoinFleet: 'join:fleet',
  JoinVehicle: 'join:vehicle',
  Joined: 'joined',
  VehiclePosition: 'vehicle:position',
  VehicleOffline: 'vehicle:offline',
  VehicleOnline: 'vehicle:online',
  RouteUpdate: 'route:update',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
