import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddOnSchemaKeys, buildQuickApp2Config, getQuickApp2FormData } from '@/form/quickApp2Form';
import { ToolsetTypes } from '@/types/quick-apps';

import { fetchDialModels, fetchDialToolsets } from '@/utils/dial-client';

const { listToolsets, listDeployments } = vi.hoisted(() => ({
  listToolsets: vi.fn(),
  listDeployments: vi.fn(),
}));

vi.mock('@/utils/chat-api-client', () => ({
  toolsetsApi: { listToolsets },
  deploymentsApi: { listDeployments },
}));

// chat-api returns ids with special characters already percent-encoded.
const ENCODED_TOOLSET_ID = 'toolsets/bucket/QA%20enc%20check__1.0.0';
const DECODED_TOOLSET_ID = 'toolsets/bucket/QA enc check__1.0.0';
const ENCODED_APP_ID = 'applications/bucket/My%20agent__1.0.0';
const DECODED_APP_ID = 'applications/bucket/My agent__1.0.0';

describe('entity id encoding', () => {
  beforeEach(() => {
    listToolsets.mockReset();
    listDeployments.mockReset();
    listToolsets.mockResolvedValue({
      data: [{ id: ENCODED_TOOLSET_ID, displayName: 'QA enc check' }],
    });
    listDeployments.mockResolvedValue({
      deployments: [{ id: ENCODED_APP_ID, type: 'application', displayName: 'My agent' }],
    });
  });

  it('keeps fetched toolset and deployment ids decoded', async () => {
    const [toolset] = await fetchDialToolsets();
    const [app] = await fetchDialModels();

    expect(toolset.id).toBe(DECODED_TOOLSET_ID);
    expect(app.id).toBe(DECODED_APP_ID);
  });

  it('saves a selected toolset and agent with their ids encoded once', async () => {
    const [toolset] = await fetchDialToolsets();
    const [app] = await fetchDialModels();
    const data = {
      ...getQuickApp2FormData(undefined, ['gpt-4o'], ['gpt-4o']),
      addOns: [toolset, app].map((entity) => ({
        [AddOnSchemaKeys.id]: entity.id,
        [AddOnSchemaKeys.isDialDeploymentTool]: false,
      })),
    };

    const { tool_sets } = buildQuickApp2Config({
      data,
      allEntitiesMap: { [toolset.id]: toolset, [app.id]: app },
      language: 'en',
    });

    expect(tool_sets).toContainEqual(
      expect.objectContaining({ type: ToolsetTypes.DialMcp, deployment_id: ENCODED_TOOLSET_ID }),
    );
    expect(tool_sets).toContainEqual(
      expect.objectContaining({ type: ToolsetTypes.DialApp, deployment_id: ENCODED_APP_ID }),
    );
  });
});
