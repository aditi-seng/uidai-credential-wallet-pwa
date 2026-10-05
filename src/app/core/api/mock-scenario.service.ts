import { Injectable, signal } from '@angular/core';

/**
 * Lets a reviewer force the mock API into each UI state without touching code.
 *  - `success` : real HTTP GET to the static mock file (so the Service Worker can cache it)
 *  - `empty`   : 200 OK with `[]`
 *  - `error`   : 503 Service Unavailable
 * Initial value can be set with `?mock=empty|error` in the URL.
 */
export type MockScenario = 'success' | 'empty' | 'error';

export const MOCK_SCENARIOS: readonly MockScenario[] = ['success', 'empty', 'error'];

@Injectable({ providedIn: 'root' })
export class MockScenarioService {
  readonly scenario = signal<MockScenario>(INITIAL_SCENARIO);
  /** Simulated network latency so the Loading state is visible. */
  readonly latencyMs = signal(700);
}

/**
 * Read once at module load, i.e. before the router's initial navigation
 * rewrites the URL (hash routing drops `?mock=` from location.search).
 * Also accepts the param inside the hash: `#/dashboard?mock=error`.
 */
const INITIAL_SCENARIO = readInitialScenario();

function readInitialScenario(): MockScenario {
  if (typeof window === 'undefined') return 'success';
  const hashQuery = window.location.hash.split('?')[1] ?? '';
  const fromUrl =
    new URLSearchParams(window.location.search).get('mock') ??
    new URLSearchParams(hashQuery).get('mock');
  return MOCK_SCENARIOS.includes(fromUrl as MockScenario) ? (fromUrl as MockScenario) : 'success';
}
