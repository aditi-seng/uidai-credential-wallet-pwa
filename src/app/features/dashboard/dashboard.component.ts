import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  MOCK_SCENARIOS,
  MockScenario,
  MockScenarioService,
} from '../../core/api/mock-scenario.service';
import { AuthService } from '../../core/auth/auth.service';
import { NetworkStatusService } from '../../core/pwa/network-status.service';
import { CredentialsPageActions } from '../../state/credentials/credentials.actions';
import {
  selectSource,
  selectSyncedAt,
  selectViewState,
} from '../../state/credentials/credentials.feature';
import { CredentialCardComponent } from './credential-card.component';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, CredentialCardComponent],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(Store);
  protected readonly auth = inject(AuthService);
  protected readonly network = inject(NetworkStatusService);
  protected readonly mock = inject(MockScenarioService);

  protected readonly view = this.store.selectSignal(selectViewState);
  protected readonly source = this.store.selectSignal(selectSource);
  protected readonly syncedAt = this.store.selectSignal(selectSyncedAt);
  /** Narrowed views of the discriminated union, for strictly-typed template access. */
  protected readonly loaded = computed(() => {
    const v = this.view();
    return v.kind === 'loaded' ? v : null;
  });
  protected readonly errorMessage = computed(() => {
    const v = this.view();
    return v.kind === 'error' ? v.message : null;
  });
  protected readonly refreshing = computed(() => this.loaded()?.refreshing ?? false);
  protected readonly scenarios = MOCK_SCENARIOS;
  protected readonly skeletons = [1, 2, 3];

  ngOnInit(): void {
    this.store.dispatch(CredentialsPageActions.opened());
  }

  retry(): void {
    this.store.dispatch(CredentialsPageActions.retryClicked());
  }

  refresh(): void {
    this.store.dispatch(CredentialsPageActions.refreshClicked());
  }

  setScenario(value: string): void {
    this.mock.scenario.set(value as MockScenario);
    this.refresh();
  }

  logout(): void {
    void this.auth.logout();
  }
}
