import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchDialApp } from '../dial-client';

const { getDeploymentDetails, listDeployments, getApplicationSchema } = vi.hoisted(() => ({
  getDeploymentDetails: vi.fn(),
  listDeployments: vi.fn(),
  getApplicationSchema: vi.fn(),
}));

vi.mock('@/utils/chat-api-client', () => ({
  skillsApi: {},
  deploymentsApi: { getDeploymentDetails, listDeployments },
  applicationsApi: { getApplicationSchema },
  isNotFoundError: () => false,
  isForbiddenError: () => false,
}));

const schema = {
  properties: {
    orchestrator: {
      properties: {
        deployment: {
          $ref: '#/$defs/DialDeploymentConfig',
          default: { deployment_id: 'model-2' },
        },
      },
    },
  },
};

describe('fetchDialApp schema defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDeployments.mockResolvedValue({ data: [] });
  });

  it('loads the schema of the application and keeps its defaults', async () => {
    getDeploymentDetails.mockResolvedValue({
      applicationDetails: { applicationTypeSchemaId: 'schema-id', displayName: 'App' },
    });
    getApplicationSchema.mockResolvedValue(schema);

    const app = await fetchDialApp('applications/public/app');

    expect(getApplicationSchema).toHaveBeenCalledWith({ id: 'schema-id' });
    expect(app?.schemaDefaults).toEqual({ deploymentId: 'model-2' });
  });

  it('opens the editor without defaults when the schema call fails', async () => {
    getDeploymentDetails.mockResolvedValue({
      applicationDetails: { applicationTypeSchemaId: 'schema-id', displayName: 'App' },
    });
    getApplicationSchema.mockRejectedValue(new Error('boom'));

    const app = await fetchDialApp('applications/public/app');

    expect(app).not.toBeNull();
    expect(app?.schemaDefaults).toEqual({});
  });

  it('does not request a schema for an application without a schema id', async () => {
    getDeploymentDetails.mockResolvedValue({ applicationDetails: { displayName: 'App' } });

    const app = await fetchDialApp('applications/public/app');

    expect(getApplicationSchema).not.toHaveBeenCalled();
    expect(app?.schemaDefaults).toEqual({});
  });
});
