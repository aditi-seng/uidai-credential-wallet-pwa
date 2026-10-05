import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { CredentialsResult } from '../../core/models/credential.model';

/** Events from the dashboard UI. */
export const CredentialsPageActions = createActionGroup({
  source: 'Credentials Page',
  events: {
    Opened: emptyProps(),
    'Retry Clicked': emptyProps(),
    'Refresh Clicked': emptyProps(),
  },
});

/** Results from the (mock) credentials API. */
export const CredentialsApiActions = createActionGroup({
  source: 'Credentials API',
  events: {
    'Load Success': props<{ result: CredentialsResult }>(),
    'Load Failure': props<{ message: string }>(),
  },
});

/** App-level events that affect the credentials slice. */
export const AppLifecycleActions = createActionGroup({
  source: 'App',
  events: {
    'Network Restored': emptyProps(),
    'User Logged Out': emptyProps(),
  },
});
