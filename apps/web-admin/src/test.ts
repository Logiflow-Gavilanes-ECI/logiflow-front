// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Mock Google Maps API for unit tests — prevents "google is not defined" errors
// in components that use google.maps without needing the real API loaded.
(window as any)['google'] = {
  maps: {
    Map: class { setCenter() {} setZoom() {} fitBounds() {} panTo() {} },
    Marker: class { setMap() {} setPosition() {} setIcon() {} setLabel() {} setAnimation() {} getPosition() { return null; } addListener() {} },
    Polyline: class { setMap() {} setOptions() {} setPath() {} },
    InfoWindow: class { open() {} close() {} },
    LatLngBounds: class { extend() {} },
    DirectionsService: class { route(_: any, cb: any) { cb(null, 'ZERO_RESULTS'); } },
    SymbolPath: { FORWARD_CLOSED_ARROW: 0, BACKWARD_CLOSED_ARROW: 1 },
    DirectionsStatus: { OK: 'OK' },
    TravelMode: { DRIVING: 'DRIVING' },
    Animation: { BOUNCE: 1 },
    event: { trigger() {} },
  },
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
