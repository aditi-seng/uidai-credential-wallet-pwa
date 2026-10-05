import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { routes } from './app.routes';
import { mockApiInterceptor } from './core/api/mock-api.interceptor';
import * as credentialsEffects from './state/credentials/credentials.effects';
import { credentialsFeature } from './state/credentials/credentials.feature';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing: deep links work on any static host (GitHub Pages) without rewrite rules.
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withFetch(), withInterceptors([mockApiInterceptor])),
    provideStore(
      {},
      {
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictStateSerializability: isDevMode(),
          strictActionSerializability: isDevMode(),
        },
      },
    ),
    provideState(credentialsFeature),
    provideEffects(credentialsEffects),
  ],
};
