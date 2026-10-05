import { Credential, CredentialsResult } from '../../core/models/credential.model';
import {
  AppLifecycleActions,
  CredentialsApiActions,
  CredentialsPageActions,
} from './credentials.actions';
import {
  credentialsFeature,
  initialCredentialsState,
  selectViewState,
} from './credentials.feature';

const { reducer } = credentialsFeature;

const credential: Credential = {
  id: 'c1',
  type: 'AADHAAR',
  title: 'Aadhaar (Mock)',
  issuer: 'Sandbox',
  holderName: 'Test User',
  identifierLabel: 'Aadhaar number',
  identifier: '9876-5432-1234',
  status: 'VERIFIED',
  issuedOn: '2021-03-14',
  expiresOn: null,
  attributes: [],
};

const result = (credentials: Credential[]): CredentialsResult => ({
  credentials,
  source: 'network',
  syncedAt: '2026-10-05T10:00:00.000Z',
});

const view = (state = initialCredentialsState) =>
  selectViewState.projector(state.credentials, state.status, state.error);

describe('credentials reducer + view selector', () => {
  it('starts in the Loading view', () => {
    expect(view()).toEqual({ kind: 'loading' });
  });

  it('opened -> Loading', () => {
    const state = reducer(initialCredentialsState, CredentialsPageActions.opened());
    expect(state.status).toBe('loading');
    expect(view(state)).toEqual({ kind: 'loading' });
  });

  it('success with data -> Loaded', () => {
    const state = reducer(
      initialCredentialsState,
      CredentialsApiActions.loadSuccess({ result: result([credential]) }),
    );
    expect(view(state)).toEqual({
      kind: 'loaded',
      credentials: [credential],
      refreshing: false,
      staleError: null,
    });
    expect(state.source).toBe('network');
  });

  it('success with [] -> Empty', () => {
    const state = reducer(
      initialCredentialsState,
      CredentialsApiActions.loadSuccess({ result: result([]) }),
    );
    expect(view(state)).toEqual({ kind: 'empty' });
  });

  it('failure with no data -> Error', () => {
    const state = reducer(
      initialCredentialsState,
      CredentialsApiActions.loadFailure({ message: 'Down' }),
    );
    expect(view(state)).toEqual({ kind: 'error', message: 'Down' });
  });

  it('failed refresh keeps showing the last good list with a stale warning', () => {
    let state = reducer(
      initialCredentialsState,
      CredentialsApiActions.loadSuccess({ result: result([credential]) }),
    );
    state = reducer(state, CredentialsPageActions.refreshClicked());
    expect(view(state)).toMatchObject({ kind: 'loaded', refreshing: true });

    state = reducer(state, CredentialsApiActions.loadFailure({ message: 'Down' }));
    expect(view(state)).toMatchObject({
      kind: 'loaded',
      staleError: 'Down',
      credentials: [credential],
    });
  });

  it('logout wipes credentials from the store', () => {
    let state = reducer(
      initialCredentialsState,
      CredentialsApiActions.loadSuccess({ result: result([credential]) }),
    );
    state = reducer(state, AppLifecycleActions.userLoggedOut());
    expect(state).toEqual(initialCredentialsState);
  });
});
