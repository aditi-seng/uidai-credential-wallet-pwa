import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, fromEvent, map, of, switchMap, withLatestFrom } from 'rxjs';
import { CredentialsApiService, toUserMessage } from '../../core/api/credentials-api.service';
import {
  AppLifecycleActions,
  CredentialsApiActions,
  CredentialsPageActions,
} from './credentials.actions';
import { selectStatus } from './credentials.feature';

/** Fetches credentials whenever the page opens, the user retries/refreshes, or the network comes back. */
export const loadCredentials = createEffect(
  (actions$ = inject(Actions), api = inject(CredentialsApiService)) =>
    actions$.pipe(
      ofType(
        CredentialsPageActions.opened,
        CredentialsPageActions.retryClicked,
        CredentialsPageActions.refreshClicked,
        AppLifecycleActions.networkRestored,
      ),
      // switchMap cancels an in-flight request if the user hits Refresh again.
      switchMap(() =>
        api.getCredentials().pipe(
          map((result) => CredentialsApiActions.loadSuccess({ result })),
          catchError((error: unknown) =>
            of(CredentialsApiActions.loadFailure({ message: toUserMessage(error) })),
          ),
        ),
      ),
    ),
  { functional: true },
);

/** Re-sync automatically when the browser reports it is back online. */
export const syncOnReconnect = createEffect(
  (store = inject(Store)) =>
    typeof window === 'undefined'
      ? of()
      : fromEvent(window, 'online').pipe(
          withLatestFrom(store.select(selectStatus)),
          // Only re-sync if the dashboard has been opened (status 'idle' = signed out / never loaded).
          filter(([, status]) => status !== 'idle'),
          map(() => AppLifecycleActions.networkRestored()),
        ),
  { functional: true },
);
