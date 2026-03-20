import { AuthTokenService } from '@logiflow/shared-auth';
import { LogiFlowSocketService } from '@logiflow/shared-socket';
import type {
  RouteUpdateEvent,
  VehiclePositionEvent,
  VehicleStatusEvent,
} from '@logiflow/shared-models';

export interface DispatcherRuntimeConfig {
  socketUrl: string;
}

function buildAuthService(): AuthTokenService {
  return new AuthTokenService(localStorage);
}

export function createDispatcherRuntime(config: DispatcherRuntimeConfig) {
  const socket = new LogiFlowSocketService({ url: config.socketUrl });
  const auth = buildAuthService();

  const onlineVehicles = new Set<string>();

  const markOffline = (payload: VehicleStatusEvent) => {
    onlineVehicles.delete(payload.vehicleId);
    console.info('[web-admin] offline', payload.vehicleId);
  };

  const markOnline = (payload: VehicleStatusEvent) => {
    onlineVehicles.add(payload.vehicleId);
    console.info('[web-admin] online', payload.vehicleId);
  };

  const positionHandler = (payload: VehiclePositionEvent) => {
    onlineVehicles.add(payload.vehicleId);
    console.info('[web-admin] position', payload.vehicleId, payload.lat, payload.lng);
  };

  const routeHandler = (payload: RouteUpdateEvent) => {
    console.info('[web-admin] route:update', payload.vehicleId, payload.stops.length);
  };

  return {
    start() {
      socket.connect();
      socket.joinFleet();

      socket.onVehiclePosition(positionHandler);
      socket.onVehicleOffline(markOffline);
      socket.onVehicleOnline(markOnline);
      socket.onRouteUpdate(routeHandler);

      if (auth.hasToken()) {
        console.info('[web-admin] token loaded');
      }
    },
  };
}
