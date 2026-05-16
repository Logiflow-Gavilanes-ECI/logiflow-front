export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3002/api/v1',
  socketBaseUrl: 'http://localhost:3001',
  adminAppUrl: 'http://localhost:4200/home',
  // Google Maps API key must be provided from local environment configuration.
  googleMapsApiKey: '',
} as const;
