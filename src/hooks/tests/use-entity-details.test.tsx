import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEntityDetails, type UseEntityDetailsResult } from '@/hooks/use-entity-details';
import type { DialSkill } from '@/types/dial-entities';
import { DetailsStatus } from '@/types/entity-details';

const { deploymentsApi, skillsApi, dataContext, appContext } = vi.hoisted(() => ({
  deploymentsApi: { getDeploymentDetails: vi.fn(), getDeploymentLimits: vi.fn() },
  skillsApi: { downloadSkillFileRaw: vi.fn(), listSkillFiles: vi.fn(), getSkillMetadata: vi.fn() },
  dataContext: { skills: [] as DialSkill[] },
  appContext: { settings: { dialCoreExternalUrl: 'https://core.example.com' } },
}));

vi.mock('@/utils/chat-api-client', () => ({ deploymentsApi, skillsApi }));
vi.mock('@/context/DataContext', () => ({ useDataContext: () => dataContext }));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => appContext }));
// Prefixes every text, so a catalog English default that slips through shows.
vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, string>) =>
      `tr:${key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? '')}`,
  }),
}));

const item = (id: string, type: CatalogEntityType, name = id): CatalogItem => ({
  id,
  type,
  name,
  version: '',
  description: '',
  topics: [],
  folder: [],
  lastUsed: '',
});

const FIGMA = item('toolsets/public/figma', CatalogEntityType.Toolset, 'Figma');
const GPT = item('gpt-4o', CatalogEntityType.Model);
const SKILL = item('skills/public/research', CatalogEntityType.Skill, 'research');

const FIGMA_DETAILS = {
  id: FIGMA.id,
  type: 'toolset',
  toolsetDetails: {
    owner: 'Figma',
    catalogProperties: { provider: 'Figma' },
    authSettings: { authenticationType: 'OAUTH' },
    allowedTools: ['edit_design'],
    allToolNames: ['edit_design', 'get_design_context', 'evaluate_script'],
  },
};

const GPT_DETAILS = {
  id: GPT.id,
  type: 'model',
  modelDetails: {
    owner: 'OpenAI',
    pricing: { unit: 'token', prompt: '0.000005', completion: '0.000015' },
  },
};

const MANIFEST = '---\nname: research\ndescription: Finds sources\n---\n# Research\nSteps.';

let root: Root;
let latest: UseEntityDetailsResult;

const Harness = ({ value }: { value?: CatalogItem }) => {
  latest = useEntityDetails(value);
  return null;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const render = async (value?: CatalogItem) => {
  await act(async () => {
    root.render(<Harness value={value} />);
    await flush();
  });
};

const sectionTitles = () => latest.details?.overview?.sections?.map((section) => section.title);

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  dataContext.skills = [];
  deploymentsApi.getDeploymentDetails.mockImplementation(({ deployment }: { deployment: string }) =>
    Promise.resolve(deployment === GPT.id ? GPT_DETAILS : FIGMA_DETAILS),
  );
  deploymentsApi.getDeploymentLimits.mockResolvedValue({
    dayTokenStats: { total: 1000, used: 250 },
  });
  skillsApi.downloadSkillFileRaw.mockImplementation(async () => ({ raw: new Response(MANIFEST) }));
  skillsApi.listSkillFiles.mockResolvedValue({
    items: [
      {
        name: 'SKILL.md',
        path: 'research/SKILL.md',
        url: 'skills/public/research/SKILL.md',
        bucket: 'public',
        nodeType: 'item',
      },
    ],
  });
  skillsApi.getSkillMetadata.mockResolvedValue({
    name: 'research',
    path: 'research',
    url: SKILL.id,
    bucket: 'public',
    nodeType: 'item',
    author: 'Ann',
  });
  root = createRoot(document.createElement('div'));
});

afterEach(() => {
  act(() => root.unmount());
});

describe('useEntityDetails', () => {
  it('makes no request without an item', async () => {
    await render(undefined);

    expect(latest.status).toBe(DetailsStatus.Idle);
    expect(deploymentsApi.getDeploymentDetails).not.toHaveBeenCalled();
  });

  it('loads a toolset’s Overview and Tools, labelled with translated texts', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    deploymentsApi.getDeploymentDetails.mockImplementationOnce(
      () => new Promise((done) => (resolve = done)),
    );
    await render(FIGMA);

    expect(latest.status).toBe(DetailsStatus.Loading);
    expect(deploymentsApi.getDeploymentLimits).not.toHaveBeenCalled();

    await act(async () => {
      resolve(FIGMA_DETAILS);
      await flush();
    });

    expect(latest.status).toBe(DetailsStatus.Ready);
    expect(sectionTitles()).toEqual(['tr:Specification']);
    const labels = latest.details?.overview?.sections?.[0]?.specs.map((spec) => spec.label);
    expect(labels).toEqual(['tr:Authentication', 'tr:Provider', 'tr:Hosted by']);
    expect(latest.details?.tools?.tools.map((tool) => tool.name)).toEqual(['edit_design']);
    // Connect: the toolset's MCP endpoint, built on the configured DIAL Core URL.
    expect(JSON.stringify(latest.details?.api)).toContain('https://core.example.com');
  });

  it('adds a model’s pricing and limits', async () => {
    await render(GPT);

    expect(latest.status).toBe(DetailsStatus.Ready);
    expect(latest.details?.pricing?.prices?.length).toBe(2);
    expect(latest.details?.limits?.groups[0]?.label).toBe('tr:Token limits');
    expect(latest.details?.limits?.groups[0]?.rows[0]?.label).toBe('tr:Today');
  });

  it('keeps a model’s details when its limits fail', async () => {
    deploymentsApi.getDeploymentLimits.mockRejectedValueOnce(new Error('403'));
    await render(GPT);

    expect(latest.status).toBe(DetailsStatus.Ready);
    expect(latest.details?.pricing).toBeTruthy();
    expect(latest.details?.limits).toBeUndefined();
  });

  it('loads a skill’s content and Overview', async () => {
    await render(SKILL);

    expect(latest.status).toBe(DetailsStatus.Ready);
    expect(latest.details?.promptContent?.content).toContain('# Research');
    expect(latest.details?.promptContent?.content).not.toContain('name: research');
    expect(latest.details?.promptContent?.description).toBe('Finds sources');
    const specs = latest.details?.overview?.sections?.flatMap((section) => section.specs);
    expect(specs?.find((spec) => spec.label === 'tr:Author')?.value).toBe('Ann');
  });

  it('reports a failure and loads again on retry', async () => {
    deploymentsApi.getDeploymentDetails.mockRejectedValueOnce(new Error('boom'));
    await render(FIGMA);

    expect(latest.status).toBe(DetailsStatus.Error);

    await act(async () => {
      latest.retry();
      await flush();
    });

    expect(latest.status).toBe(DetailsStatus.Ready);
    expect(deploymentsApi.getDeploymentDetails).toHaveBeenCalledTimes(2);
  });

  it('drops a response for an item that is no longer shown', async () => {
    let resolveFigma: (value: unknown) => void = () => undefined;
    deploymentsApi.getDeploymentDetails.mockImplementationOnce(
      () => new Promise((done) => (resolveFigma = done)),
    );
    await render(FIGMA);
    await render(GPT);

    await act(async () => {
      resolveFigma(FIGMA_DETAILS);
      await flush();
    });

    expect(latest.status).toBe(DetailsStatus.Ready);
    expect(latest.details?.tools).toBeUndefined();
    expect(latest.details?.pricing).toBeTruthy();
  });

  it('does not refetch when the same item is handed over again', async () => {
    await render(FIGMA);
    await render({ ...FIGMA, name: 'Figma (renamed)' });

    expect(deploymentsApi.getDeploymentDetails).toHaveBeenCalledTimes(1);
  });
});
