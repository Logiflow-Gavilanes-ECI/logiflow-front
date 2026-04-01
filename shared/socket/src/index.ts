import { io, type Socket } from 'socket.io-client';

const SOCKET_EVENTS = {
  JoinFleet: 'join:fleet',
  JoinVehicle: 'join:vehicle',
  Joined: 'joined',
  VehiclePosition: 'vehicle:position',
  VehicleOffline: 'vehicle:offline',
  VehicleOnline: 'vehicle:online',
  RouteUpdate: 'route:update',
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
}

export class LogiFlowSocketService {
  private readonly socket: Socket;

  constructor(config: LogiFlowSocketConfig) {
    this.socket = io(config.url, {
      autoConnect: config.autoConnect ?? true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
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
}
