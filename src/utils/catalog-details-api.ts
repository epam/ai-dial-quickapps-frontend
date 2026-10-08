import type { CatalogDetailsApi } from '@epam/ai-dial-chat-hooks/catalog';

import { deploymentsApi, skillsApi } from '@/utils/chat-api-client';
import { encodeDialPath } from '@/utils/dial-client';

const rejectPrompt = (): Promise<never> =>
  Promise.reject(new Error('Prompts are not shown in the app editor'));

/**
 * The port `useCatalogItemDetails` fetches through, over this app's chat-api
 * client. Deployment ids are kept decoded in this app, so they are
 * re-encoded to chat-api's canonical form (see `encodeDialPath`). Prompts are
 * never opened here, so the prompt methods reject.
 */
export const createCatalogDetailsApi = (): CatalogDetailsApi => ({
  getDeploymentDetails: (deploymentId) =>
    deploymentsApi.getDeploymentDetails({ deployment: encodeDialPath(deploymentId) }),
  getDeploymentLimits: (deploymentId) =>
    deploymentsApi.getDeploymentLimits({ deployment: encodeDialPath(deploymentId) }),
  getPrompt: rejectPrompt,
  getPublicPrompt: rejectPrompt,
  downloadSkillFile: async (bucket, path, filePath, signal) => {
    const response = await skillsApi.downloadSkillFileRaw({ bucket, path, filePath }, { signal });
    return response.raw;
  },
  listSkillFiles: (params, signal) => skillsApi.listSkillFiles(params, { signal }),
  getSkillMetadata: (bucket, path, signal) =>
    skillsApi.getSkillMetadata({ bucket, path }, { signal }),
});
