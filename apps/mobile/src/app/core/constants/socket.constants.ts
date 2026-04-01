export const SocketEventConstants = {
  routeUpdate: 'route:update',
  vehicleStatus: 'vehicle:status',
  joinRoom: 'join:vehicle',
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