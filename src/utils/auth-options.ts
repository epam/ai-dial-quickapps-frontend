import type { AuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

import { errorObjLog } from '@/server/logger';
import Auth0Provider from 'next-auth/providers/auth0';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CognitoProvider from 'next-auth/providers/cognito';
import GitLabProvider from 'next-auth/providers/gitlab';
import GoogleProvider from 'next-auth/providers/google';
import type { Provider } from 'next-auth/providers/index';
import KeycloakProvider from 'next-auth/providers/keycloak';
import OktaProvider from 'next-auth/providers/okta';

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface RefreshTokenConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}

const getRefreshTokenConfig = (provider: string | undefined): RefreshTokenConfig | undefined => {
  switch (provider) {
    case 'keycloak':
      return {
        tokenUrl: `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
        clientId: process.env.AUTH_KEYCLOAK_CLIENT_ID!,
        clientSecret: process.env.AUTH_KEYCLOAK_CLIENT_SECRET!,
      };
    case 'azure-ad':
      return {
        tokenUrl: `https://login.microsoftonline.com/${process.env.AUTH_AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
        clientId: process.env.AUTH_AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET!,
      };
    case 'google':
      return {
        tokenUrl: 'https://oauth2.googleapis.com/token',
        clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
      };
    case 'auth0':
      return {
        tokenUrl: `${process.env.AUTH_AUTH0_ISSUER}/oauth/token`,
        clientId: process.env.AUTH_AUTH0_CLIENT_ID!,
        clientSecret: process.env.AUTH_AUTH0_CLIENT_SECRET!,
      };
    case 'okta':
      return {
        tokenUrl: `${process.env.AUTH_OKTA_ISSUER}/v1/token`,
        clientId: process.env.AUTH_OKTA_CLIENT_ID!,
        clientSecret: process.env.AUTH_OKTA_CLIENT_SECRET!,
      };
    case 'cognito':
      return {
        tokenUrl: `${process.env.AUTH_COGNITO_ISSUER}/oauth2/token`,
        clientId: process.env.AUTH_COGNITO_CLIENT_ID!,
        clientSecret: process.env.AUTH_COGNITO_CLIENT_SECRET!,
      };
    case 'gitlab':
      return {
        tokenUrl: `https://${process.env.AUTH_GITLAB_HOST}/oauth/token`,
        clientId: process.env.AUTH_GITLAB_CLIENT_ID!,
        clientSecret: process.env.AUTH_GITLAB_SECRET!,
      };
    default:
      return undefined;
  }
};

const refreshAccessToken = async (token: JWT): Promise<JWT> => {
  try {
    const config = getRefreshTokenConfig(token.provider as string | undefined);
    if (!config) {
      throw new Error(`No refresh token config for provider: ${token.provider}`);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: token.refreshToken ?? '',
      }),
    });

    const refreshed = (await response.json()) as OAuthTokenResponse;

    if (!response.ok || refreshed.error) {
      throw new Error(refreshed.error_description ?? refreshed.error ?? 'Token refresh failed');
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    errorObjLog(error, `auth: failed to refresh token for provider ${String(token.provider)}`);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
};

const DEFAULT_PROVIDER_NAME = 'SSO';

const authProviders: (Provider | false)[] = [
  !!process.env.AUTH_KEYCLOAK_ISSUER &&
    !!process.env.AUTH_KEYCLOAK_CLIENT_ID &&
    !!process.env.AUTH_KEYCLOAK_CLIENT_SECRET &&
    KeycloakProvider({
      clientId: process.env.AUTH_KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
      name: process.env.AUTH_KEYCLOAK_NAME ?? DEFAULT_PROVIDER_NAME,
    }),

  !!process.env.AUTH_AZURE_AD_CLIENT_ID &&
    !!process.env.AUTH_AZURE_AD_CLIENT_SECRET &&
    !!process.env.AUTH_AZURE_AD_TENANT_ID &&
    AzureADProvider({
      clientId: process.env.AUTH_AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AUTH_AZURE_AD_TENANT_ID,
      name: process.env.AUTH_AZURE_AD_NAME ?? DEFAULT_PROVIDER_NAME,
      authorization: {
        params: {
          scope:
            process.env.AUTH_AZURE_AD_SCOPE ??
            'openid profile user.Read email offline_access',
        },
      },
    }),

  !!process.env.AUTH_GOOGLE_CLIENT_ID &&
    !!process.env.AUTH_GOOGLE_CLIENT_SECRET &&
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
      name: process.env.AUTH_GOOGLE_NAME ?? DEFAULT_PROVIDER_NAME,
      authorization: {
        params: {
          scope: process.env.AUTH_GOOGLE_SCOPE ?? 'openid email profile offline_access',
        },
      },
    }),

  !!process.env.AUTH_AUTH0_CLIENT_ID &&
    !!process.env.AUTH_AUTH0_CLIENT_SECRET &&
    !!process.env.AUTH_AUTH0_ISSUER &&
    Auth0Provider({
      clientId: process.env.AUTH_AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH_AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH_AUTH0_ISSUER,
      name: process.env.AUTH_AUTH0_NAME ?? DEFAULT_PROVIDER_NAME,
    }),

  !!process.env.AUTH_OKTA_CLIENT_ID &&
    !!process.env.AUTH_OKTA_CLIENT_SECRET &&
    !!process.env.AUTH_OKTA_ISSUER &&
    OktaProvider({
      clientId: process.env.AUTH_OKTA_CLIENT_ID!,
      clientSecret: process.env.AUTH_OKTA_CLIENT_SECRET!,
      issuer: process.env.AUTH_OKTA_ISSUER,
      name: process.env.AUTH_OKTA_NAME ?? DEFAULT_PROVIDER_NAME,
    }),

  !!process.env.AUTH_COGNITO_CLIENT_ID &&
    !!process.env.AUTH_COGNITO_CLIENT_SECRET &&
    !!process.env.AUTH_COGNITO_ISSUER &&
    CognitoProvider({
      clientId: process.env.AUTH_COGNITO_CLIENT_ID!,
      clientSecret: process.env.AUTH_COGNITO_CLIENT_SECRET!,
      issuer: process.env.AUTH_COGNITO_ISSUER,
      name: process.env.AUTH_COGNITO_NAME ?? DEFAULT_PROVIDER_NAME,
    }),

  !!process.env.AUTH_GITLAB_CLIENT_ID &&
    !!process.env.AUTH_GITLAB_SECRET &&
    !!process.env.AUTH_GITLAB_HOST &&
    GitLabProvider({
      clientId: process.env.AUTH_GITLAB_CLIENT_ID!,
      clientSecret: process.env.AUTH_GITLAB_SECRET!,
      issuer: `https://${process.env.AUTH_GITLAB_HOST}`,
      name: process.env.AUTH_GITLAB_NAME ?? DEFAULT_PROVIDER_NAME,
      authorization: {
        params: {
          scope: process.env.AUTH_GITLAB_SCOPE ?? 'read_user',
        },
      },
    }),
];

export const authOptions: AuthOptions = {
  providers: authProviders.filter((provider): provider is Provider => !!provider),
  session: { strategy: 'jwt' },
  callbacks: {
    jwt: async ({ token, account }) => {
      if (account) {
        return {
          ...token,
          provider: account.provider,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + (Number(account.expires_in) || 3600) * 1000,
          refreshToken: account.refresh_token,
        };
      }

      if (typeof token.accessTokenExpires === 'number' && Date.now() < token.accessTokenExpires) {
        return token;
      }

      return refreshAccessToken(token);
    },
    session: ({ session, token }) => {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      if (token.error) {
        session.error = token.error;
      }
      if (token.provider) {
        session.provider = token.provider;
      }
      return session;
    },
  },
};
