import { io, type Socket } from 'socket.io-client';

export const SocketEventConstants = {
  joinFleet: 'join:fleet',
  joinRoom: 'join:vehicle',
  joined: 'joined',
  vehiclePosition: 'vehicle:position',
  vehicleOffline: 'vehicle:offline',
  vehicleOnline: 'vehicle:online',
  routeUpdate: 'route:update',
  vehicleStatus: 'vehicle:status',
} as const;

export const SocketRoomConstants = {
  vehiclePrefix: 'vehicle:',
} as const;

export const SocketConnectionConstants = {
  authTokenKey: 'token',
  connectErrorEvent: 'connect_error',
  authErrorCode: 'AUTH_ERROR',
  disconnectReasonAuth: 'io server disconnect',
} as const;

export function buildVehicleRoomName(vehicleId: string): string {
  return `${SocketRoomConstants.vehiclePrefix}${vehicleId}`;
}

const SOCKET_EVENTS = {
  JoinFleet: SocketEventConstants.joinFleet,
  JoinVehicle: SocketEventConstants.joinRoom,
  Joined: SocketEventConstants.joined,
  VehiclePosition: SocketEventConstants.vehiclePosition,
  VehicleOffline: SocketEventConstants.vehicleOffline,
  VehicleOnline: SocketEventConstants.vehicleOnline,
  RouteUpdate: SocketEventConstants.routeUpdate,
} as const;

export interface JoinRoomAck {
  room: string;
}

export interface RouteStop {
  id: string;
  lat: number;
  lng: number;
  order?: number;
  type?: string;
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

export interface VehiclePositionEvent {
  vehicleId: string;
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
}

export interface VehicleStatusEvent {
  vehicleId: string;
}

export interface JoinVehiclePayload {
  vehicleId: string;
}

export interface LogiFlowSocketConfig {
  url: string;
  autoConnect?: boolean;
  auth?: { token: string };
}

export class LogiFlowSocketService {
  private readonly socket: Socket;

  constructor(config: LogiFlowSocketConfig) {
    this.socket = io(config.url, {
      autoConnect: config.autoConnect ?? true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: config.auth,
    });
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  isConnected(): boolean {
    return this.socket.connected;
  }

  joinFleet(): void {
    this.socket.emit(SOCKET_EVENTS.JoinFleet);
  }

  joinVehicle(payload: JoinVehiclePayload): void {
    this.socket.emit(SOCKET_EVENTS.JoinVehicle, payload);
  }

  sendVehicleHeartbeat(payload: { vehicleId: string }): void {
    this.socket.emit(SOCKET_EVENTS.VehiclePosition, payload);
  }

  onJoined(handler: (ack: JoinRoomAck) => void): () => void {
    this.socket.on(SOCKET_EVENTS.Joined, handler);
    return () => this.socket.off(SOCKET_EVENTS.Joined, handler);
  }

  onVehiclePosition(handler: (payload: VehiclePositionEvent) => void): () => void {
    this.socket.on(SOCKET_EVENTS.VehiclePosition, handler);
    return () => this.socket.off(SOCKET_EVENTS.VehiclePosition, handler);
  }

  onRouteUpdate(handler: (payload: RouteUpdateEvent) => void): () => void {
    this.socket.on(SOCKET_EVENTS.RouteUpdate, handler);
    return () => this.socket.off(SOCKET_EVENTS.RouteUpdate, handler);
  }

  onVehicleOffline(handler: (payload: VehicleStatusEvent) => void): () => void {
    this.socket.on(SOCKET_EVENTS.VehicleOffline, handler);
    return () => this.socket.off(SOCKET_EVENTS.VehicleOffline, handler);
  }

  onVehicleOnline(handler: (payload: VehicleStatusEvent) => void): () => void {
    this.socket.on(SOCKET_EVENTS.VehicleOnline, handler);
    return () => this.socket.off(SOCKET_EVENTS.VehicleOnline, handler);
  }

  onDisconnect(handler: () => void): () => void {
    this.socket.on('disconnect', handler);
    return () => this.socket.off('disconnect', handler);
  }

  onConnectError(handler: (err: Error) => void): () => void {
    this.socket.on('connect_error', handler);
    return () => this.socket.off('connect_error', handler);
  }
}
