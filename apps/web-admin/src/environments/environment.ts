// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
<<<<<<< HEAD
  googleMapsApiKey: '',
  realtimeUrl: '',
=======
  realtimeUrl: 'http://localhost:3001',
  googleMapsApiKey: '',
  apiUrl: 'http://localhost:3002/api/v1',
>>>>>>> e2a8220 (feat(frontend): add loading skeletons for vehicle list and map content #307)
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
