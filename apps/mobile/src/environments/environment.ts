export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3002/api/v1',
  socketBaseUrl: 'http://localhost:3001',
  // Google Maps API key must be provided from local environment configuration.
  googleMapsApiKey: '',
} as const;
