import { totalPolylineDistanceKm } from '@logiflow/shared-maps';
import { LogiFlowSocketService } from '@logiflow/shared-socket';
import type { RouteUpdateEvent } from '@logiflow/shared-models';

export interface DriverRuntimeConfig {
  socketUrl: string;
}

export function createDriverRuntime(config: DriverRuntimeConfig) {
  const socket = new LogiFlowSocketService({ url: config.socketUrl });

  return {
    start() {
      socket.connect();
      socket.joinFleet();

      socket.onJoined((ack) => {
        console.info('[mobile] joined room', ack.room);
      });

      socket.onRouteUpdate((route: RouteUpdateEvent) => {
        const coords = route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }));
        const fallbackDistance = totalPolylineDistanceKm(coords);

        console.info('[mobile] route update', {
          vehicleId: route.vehicleId,
          estimatedTime: route.estimatedTime,
          backendDistance: route.totalDistance,
          fallbackDistance,
        });
      });
    },
  };
}
