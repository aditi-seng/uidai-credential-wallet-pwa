import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Credential, CredentialStatus, CredentialType } from '../../core/models/credential.model';
import { SecureDataMaskComponent } from '../../shared/secure-data-mask/secure-data-mask.component';

const TYPE_BADGE: Record<CredentialType, string> = {
  AADHAAR: 'AA',
  EKYC: 'KYC',
  PAN: 'PAN',
  DRIVING_LICENCE: 'DL',
  VOTER_ID: 'VID',
};

const STATUS_LABEL: Record<CredentialStatus, string> = {
  VERIFIED: 'Verified',
  PENDING: 'Pending',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

@Component({
  selector: 'app-credential-card',
  imports: [DatePipe, SecureDataMaskComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = credential();
    <article class="card" [attr.aria-labelledby]="headingId()">
      <header class="card__head">
        <span class="card__badge" aria-hidden="true">{{ badge() }}</span>
        <div class="card__titles">
          <h2 class="card__title" [id]="headingId()">{{ c.title }}</h2>
          <p class="card__issuer">{{ c.issuer }}</p>
        </div>
        <span class="chip" [class]="'chip chip--' + c.status.toLowerCase()">
          <span class="visually-hidden">Status: </span>{{ statusLabel() }}
        </span>
      </header>

      <div class="card__secure">
        <p class="card__field-label">{{ c.identifierLabel }}</p>
        <app-secure-data-mask [value]="c.identifier" [label]="c.identifierLabel" />
      </div>

      <dl class="card__meta">
        <div>
          <dt>Holder</dt>
          <dd>{{ c.holderName }}</dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{{ c.issuedOn | date: 'mediumDate' }}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{{ c.expiresOn ? (c.expiresOn | date: 'mediumDate') : 'Does not expire' }}</dd>
        </div>
        @for (attr of c.attributes; track attr.label) {
          <div>
            <dt>{{ attr.label }}</dt>
            <dd>{{ attr.value }}</dd>
          </div>
        }
      </dl>
    </article>
  `,
})
export class CredentialCardComponent {
  readonly credential = input.required<Credential>();

  protected readonly headingId = computed(() => `cred-title-${this.credential().id}`);
  protected readonly badge = computed(() => TYPE_BADGE[this.credential().type] ?? 'ID');
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.credential().status]);
}
