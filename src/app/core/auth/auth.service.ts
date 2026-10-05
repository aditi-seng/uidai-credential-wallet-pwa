import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppLifecycleActions } from '../../state/credentials/credentials.actions';
import { clearOfflineCredentialCache } from '../pwa/service-worker';

export interface SandboxUser {
  userId: string;
  displayName: string;
}

/** OTP accepted by the mock login. Shown on the login screen as a hint. */
export const MOCK_OTP = '123456';
const SESSION_KEY = 'sandbox-wallet.session';

/**
 * Mock authentication for the Sandbox. Only a display-safe session marker is
 * kept in sessionStorage (cleared when the tab closes) - never identity data.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly _user = signal<SandboxUser | null>(readSession());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  async login(userId: string, otp: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400)); // simulate auth round-trip
    if (otp !== MOCK_OTP) {
      throw new Error('Incorrect OTP. For the Sandbox, use 123456.');
    }
    const user: SandboxUser = { userId, displayName: 'Test User' };
    this._user.set(user);
    writeSession(user);
  }

  async logout(): Promise<void> {
    this._user.set(null);
    writeSession(null);
    this.store.dispatch(AppLifecycleActions.userLoggedOut()); // clears credentials from NgRx memory
    await clearOfflineCredentialCache(); // and from the Service Worker's Cache Storage
    await this.router.navigateByUrl('/login');
  }
}

function readSession(): SandboxUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SandboxUser) : null;
  } catch {
    return null;
  }
}

function writeSession(user: SandboxUser | null): void {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode) - session simply won't survive reload */
  }
}
