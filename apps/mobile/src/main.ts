import { RouteReuseStrategy } from '@angular/router';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';

void bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular(),
    provideHttpClient(),
    provideRouter(appRoutes),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
}).catch((error: unknown) => {
  console.error('[mobile] bootstrap failed', error);
});
