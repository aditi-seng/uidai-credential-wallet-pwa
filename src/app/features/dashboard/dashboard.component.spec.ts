import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Credential } from '../../core/models/credential.model';
import { CredentialsPageActions } from '../../state/credentials/credentials.actions';
import {
  CredentialsViewState,
  selectSource,
  selectSyncedAt,
  selectViewState,
} from '../../state/credentials/credentials.feature';
import { DashboardComponent } from './dashboard.component';

const credential: Credential = {
  id: 'c1',
  type: 'AADHAAR',
  title: 'Aadhaar (Mock)',
  issuer: 'Sandbox Identity Authority',
  holderName: 'Test User',
  identifierLabel: 'Aadhaar number',
  identifier: '9876-5432-1234',
  status: 'VERIFIED',
  issuedOn: '2021-03-14',
  expiresOn: null,
  attributes: [],
};

async function renderWith(viewState: CredentialsViewState) {
  const view = await render(DashboardComponent, {
    providers: [
      provideRouter([]),
      provideMockStore({
        selectors: [
          { selector: selectViewState, value: viewState },
          { selector: selectSource, value: 'network' },
          { selector: selectSyncedAt, value: null },
        ],
      }),
    ],
  });
  const store = view.fixture.debugElement.injector.get(MockStore);
  return { ...view, store };
}

describe('DashboardComponent UI states', () => {
  it('dispatches "opened" on init so the effect fetches GET /api/credentials', async () => {
    const dispatch = vi.spyOn(MockStore.prototype, 'dispatch');
    await renderWith({ kind: 'loading' });
    expect(dispatch).toHaveBeenCalledWith(CredentialsPageActions.opened());
    dispatch.mockRestore();
  });

  it('Loading: shows skeletons and announces loading', async () => {
    await renderWith({ kind: 'loading' });
    expect(screen.getByTestId('loading-state')).toBeTruthy();
    expect(screen.getByText('Loading your credentials…')).toBeTruthy();
  });

  it('Error: shows an alert with a retry button that dispatches retryClicked', async () => {
    const { store } = await renderWith({
      kind: 'error',
      message: 'The credential service is temporarily unavailable.',
    });
    const dispatch = vi.spyOn(store, 'dispatch');

    expect(screen.getByRole('alert').textContent).toContain('temporarily unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(dispatch).toHaveBeenCalledWith(CredentialsPageActions.retryClicked());
  });

  it('Empty: explains there are no credentials', async () => {
    await renderWith({ kind: 'empty' });
    expect(screen.getByRole('heading', { name: 'No credentials yet' })).toBeTruthy();
  });

  it('Loaded: renders a card per credential with the identifier masked', async () => {
    await renderWith({
      kind: 'loaded',
      credentials: [credential],
      refreshing: false,
      staleError: null,
    });

    expect(screen.getByRole('heading', { name: 'Aadhaar (Mock)' })).toBeTruthy();
    expect(screen.getByTestId('sdm-value').textContent?.trim()).toBe('XXXX-XXXX-1234');
    expect(document.body.textContent).not.toContain('9876-5432');
  });
});
