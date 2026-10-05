import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import { CredentialsApiService } from '../../core/api/credentials-api.service';
import { CredentialsApiActions, CredentialsPageActions } from './credentials.actions';
import { loadCredentials } from './credentials.effects';

describe('loadCredentials effect', () => {
  function setup(api: Partial<CredentialsApiService>) {
    const actions$ = new Subject<Action>();
    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: CredentialsApiService, useValue: api },
      ],
    });
    const effect$ = TestBed.runInInjectionContext(() => loadCredentials());
    return { actions$, effect$ };
  }

  it('maps a successful fetch to loadSuccess', async () => {
    const result = { credentials: [], source: 'network' as const, syncedAt: 'now' };
    const { actions$, effect$ } = setup({ getCredentials: () => of(result) });

    const next = firstValueFrom(effect$);
    actions$.next(CredentialsPageActions.opened());

    expect(await next).toEqual(CredentialsApiActions.loadSuccess({ result }));
  });

  it('maps an API failure to a user-friendly loadFailure', async () => {
    const error = new HttpErrorResponse({ status: 503 });
    const { actions$, effect$ } = setup({ getCredentials: () => throwError(() => error) });

    const next = firstValueFrom(effect$);
    actions$.next(CredentialsPageActions.retryClicked());

    expect(await next).toEqual(
      CredentialsApiActions.loadFailure({
        message: 'The credential service is temporarily unavailable.',
      }),
    );
  });
});
