/** Kinds of simulated credentials the Sandbox wallet can hold. */
export type CredentialType = 'AADHAAR' | 'EKYC' | 'PAN' | 'DRIVING_LICENCE' | 'VOTER_ID';

export type CredentialStatus = 'VERIFIED' | 'PENDING' | 'EXPIRED' | 'REVOKED';

/** A non-sensitive attribute shown in clear text on the credential card. */
export interface CredentialAttribute {
  label: string;
  value: string;
}

/**
 * Shape returned by the mock `GET /api/credentials` endpoint.
 * `identifier` is the only sensitive field and is always rendered through
 * `SecureDataMaskComponent` - never interpolated directly in a template.
 */
export interface Credential {
  id: string;
  type: CredentialType;
  title: string;
  issuer: string;
  holderName: string;
  identifierLabel: string;
  identifier: string;
  status: CredentialStatus;
  issuedOn: string;
  expiresOn: string | null;
  attributes: CredentialAttribute[];
}

/** Where the last successful credential list came from. */
export type CredentialSource = 'network' | 'cache';

export interface CredentialsResult {
  credentials: Credential[];
  source: CredentialSource;
  /** ISO timestamp of when the data was fetched (or cached, for offline responses). */
  syncedAt: string;
}
