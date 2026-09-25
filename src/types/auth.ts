export enum AuthStatus {
  Loading = 'loading',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
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
