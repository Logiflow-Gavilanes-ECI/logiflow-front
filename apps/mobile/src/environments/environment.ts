export const environment = {
  production: false,
  apiBaseUrl: 'http://10.0.2.2:3002/api/v1',
  socketBaseUrl: 'http://10.0.2.2:3001',
  adminAppUrl: 'http://10.0.2.2:4200/home',
  // Google Maps API key must be provided from local environment configuration.
  googleMapsApiKey: '',
} as const;
