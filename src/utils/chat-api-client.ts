import {
  AppConfigApi,
  ApplicationsApi,
  Configuration,
  DeploymentsApi,
  FilesApi,
  ResponseError,
  SkillsApi,
  ToolsetsApi,
  UserConfigApi,
} from '@epam/ai-dial-chat-api-client';

import { handleUnauthorizedResponse } from '@/utils/handle-unauthorized-response';
import { chatApiFetch } from '@/utils/chat-api-fetch';

// One shared Configuration for every typed chat-api domain call: routes
// every request through chatApiFetch (CSRF header + credentials), and fires
// the existing reload-once-then-sign-out loop breaker on any 401 — same
// behavior `dialClient`/`dial-files-api` used to apply by hand on every call.
// Deliberately not used for `/api/v1/auth/me` itself (see `auth-api.ts`):
// a 401 there means "not logged in", not "token expired".
const configuration = new Configuration({
  basePath: '',
  fetchApi: chatApiFetch,
  middleware: [
    {
      post: async ({ response }) => {
        handleUnauthorizedResponse(response);
      },
    },
  ],
});

export const applicationsApi = new ApplicationsApi(configuration);
export const deploymentsApi = new DeploymentsApi(configuration);
export const filesApi = new FilesApi(configuration);
export const toolsetsApi = new ToolsetsApi(configuration);
export const appConfigApi = new AppConfigApi(configuration);
export const skillsApi = new SkillsApi(configuration);
export const userConfigApi = new UserConfigApi(configuration);

export const isNotFoundError = (error: unknown): boolean =>
  error instanceof ResponseError && error.response.status === 404;

export const isForbiddenError = (error: unknown): boolean =>
  error instanceof ResponseError && error.response.status === 403;
