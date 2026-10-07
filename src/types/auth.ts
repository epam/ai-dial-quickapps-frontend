export enum AuthStatus {
  Loading = 'loading',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
}

/** Why sign-in can't be offered; a host or deployment configuration problem. */
export enum AuthErrorReason {
  NoProvider = 'no-provider',
  ProviderNotConfigured = 'provider-not-configured',
}

export interface UserProfile {
  sub: string;
  providerId: string;
  claims: Record<string, string | boolean | undefined>;
  bucket: string;
  isAdmin: boolean;
}

export interface AuthProviderInfo {
  id: string;
  label: string;
}
