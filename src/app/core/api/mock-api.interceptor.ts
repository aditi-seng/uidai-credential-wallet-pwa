import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { delay, of, switchMap, throwError, timer } from 'rxjs';
import { MockScenarioService } from './mock-scenario.service';

export const CREDENTIALS_ENDPOINT = 'api/credentials';

/**
 * Dummy backend for `GET /api/credentials`.
 * Only the `success` scenario reaches the network, which keeps the
 * Service Worker's offline cache in the loop exactly like a real API.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !req.url.endsWith(CREDENTIALS_ENDPOINT)) {
    return next(req);
  }

  const mock = inject(MockScenarioService);
  const latency = mock.latencyMs();

  switch (mock.scenario()) {
    case 'empty':
      return of(new HttpResponse({ status: 200, url: req.url, body: [] })).pipe(delay(latency));
    case 'error':
      return timer(latency).pipe(
        switchMap(() =>
          throwError(
            () =>
              new HttpErrorResponse({
                status: 503,
                statusText: 'Service Unavailable',
                url: req.url,
                error: { message: 'Mock API failure' },
              }),
          ),
        ),
      );
    default:
      return next(req).pipe(delay(latency));
  }
};
