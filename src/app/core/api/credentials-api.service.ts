import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Credential, CredentialsResult } from '../models/credential.model';
import { CREDENTIALS_ENDPOINT } from './mock-api.interceptor';

/** Headers added by `public/sw.js` when it answers from Cache Storage. */
export const SW_CACHE_SOURCE_HEADER = 'X-Cache-Source';
export const SW_CACHED_AT_HEADER = 'X-Cached-At';

@Injectable({ providedIn: 'root' })
export class CredentialsApiService {
  private readonly http = inject(HttpClient);

  getCredentials(): Observable<CredentialsResult> {
    // Relative URL so it resolves against <base href> (works on GitHub Pages sub-paths too).
    return this.http.get<Credential[]>(CREDENTIALS_ENDPOINT, { observe: 'response' }).pipe(
      map((res) => {
        if (!Array.isArray(res.body)) {
          throw new Error('Malformed response: expected an array of credentials.');
        }
        const fromCache = isFromSwCache(res.headers);
        return {
          credentials: res.body,
          source: fromCache ? 'cache' : 'network',
          syncedAt: (fromCache && res.headers.get(SW_CACHED_AT_HEADER)) || new Date().toISOString(),
        } satisfies CredentialsResult;
      }),
    );
  }
}

function isFromSwCache(headers: HttpHeaders): boolean {
  return headers.get(SW_CACHE_SOURCE_HEADER) === 'sw-cache';
}

/** Maps any failure into a short, user-facing message (no stack traces / raw payloads). */
export function toUserMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // status 0 = request never completed; X-Offline = our Service Worker had no cached copy to serve.
    if (error.status === 0 || error.headers?.get('X-Offline') === 'true')
      return 'You appear to be offline and no saved copy of your credentials is available yet.';
    if (error.status === 503) return 'The credential service is temporarily unavailable.';
    if (error.status === 401 || error.status === 403)
      return 'Your session has expired. Please sign in again.';
    return `We couldn't load your credentials (error ${error.status}).`;
  }
  return "We couldn't load your credentials. Please try again.";
}
