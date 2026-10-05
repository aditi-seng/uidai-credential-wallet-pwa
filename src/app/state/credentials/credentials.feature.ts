import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { Credential, CredentialSource } from '../../core/models/credential.model';
import {
  AppLifecycleActions,
  CredentialsApiActions,
  CredentialsPageActions,
} from './credentials.actions';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface CredentialsState {
  credentials: Credential[];
  status: LoadStatus;
  error: string | null;
  source: CredentialSource | null;
  syncedAt: string | null;
}

export const initialCredentialsState: CredentialsState = {
  credentials: [],
  status: 'idle',
  error: null,
  source: null,
  syncedAt: null,
};

/**
 * One discriminated union drives the dashboard template, so the view can
 * never be in two states at once (e.g. "loading" AND "error").
 */
export type CredentialsViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'loaded'; credentials: Credential[]; refreshing: boolean; staleError: string | null };

export const credentialsFeature = createFeature({
  name: 'credentials',
  reducer: createReducer(
    initialCredentialsState,
    on(
      CredentialsPageActions.opened,
      CredentialsPageActions.retryClicked,
      CredentialsPageActions.refreshClicked,
      AppLifecycleActions.networkRestored,
      (state): CredentialsState => ({ ...state, status: 'loading', error: null }),
    ),
    on(CredentialsApiActions.loadSuccess, (state, { result }): CredentialsState => ({
      ...state,
      status: 'success',
      credentials: result.credentials,
      source: result.source,
      syncedAt: result.syncedAt,
      error: null,
    })),
    on(
      CredentialsApiActions.loadFailure,
      // Keep previously loaded credentials so a failed refresh doesn't blank the screen.
      (state, { message }): CredentialsState => ({ ...state, status: 'error', error: message }),
    ),
    // Wipe identity data from memory on logout.
    on(AppLifecycleActions.userLoggedOut, (): CredentialsState => initialCredentialsState),
  ),
  extraSelectors: ({ selectCredentials, selectStatus, selectError }) => ({
    selectViewState: createSelector(
      selectCredentials,
      selectStatus,
      selectError,
      (credentials, status, error): CredentialsViewState => {
        const hasData = credentials.length > 0;
        if (hasData) {
          return {
            kind: 'loaded',
            credentials,
            refreshing: status === 'loading',
            staleError: status === 'error' ? error : null,
          };
        }
        switch (status) {
          case 'idle':
          case 'loading':
            return { kind: 'loading' };
          case 'error':
            return { kind: 'error', message: error ?? 'Something went wrong.' };
          default:
            return { kind: 'empty' };
        }
      },
    ),
  }),
});

export const { selectCredentials, selectStatus, selectSource, selectSyncedAt, selectViewState } =
  credentialsFeature;
