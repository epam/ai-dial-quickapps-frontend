import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import { DialEntityType } from '@/types/dial-entities';
import { ApplicationStatus, type DialModel } from '@/types/dial-entities';
import { LoadStatus } from '@/types/load-status';

import AgentsList from '../AgentsList';

const makeAgent = (id: string, name: string, overrides: Partial<DialModel> = {}) =>
  ({ id, reference: id, name, type: DialEntityType.Application, ...overrides }) as DialModel;

const RESEARCH = makeAgent('applications/public/research', 'Research Agent', { version: '2.1' });
const GPT = makeAgent('gpt-4o', 'GPT-4o', { type: DialEntityType.Model });
const OFFLINE = makeAgent('applications/public/offline', 'Offline', {
  functionStatus: ApplicationStatus.Undeployed,
});

const data = vi.hoisted(() => ({ status: 'ready' as LoadStatus }));

vi.mock('@/hooks/use-add-on-entity-map', () => ({
  useAddOnEntityMap: () => ({ [RESEARCH.id]: RESEARCH, [GPT.id]: GPT, [OFFLINE.id]: OFFLINE }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ status: data.status }),
}));

interface PopupStubProps {
  agentId: string;
  onRemove: (id: string) => void;
  onClose: () => void;
}

vi.mock('@/components/Agents/AgentDetailsPopup/AgentDetailsPopup', () => ({
  AgentDetailsPopup: ({ agentId, onRemove, onClose }: PopupStubProps) => (
    <div role="dialog" aria-label={agentId}>
      <button type="button" onClick={() => (onRemove(agentId), onClose())}>
        Delete
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const dom = setupTestRoot();

interface HarnessProps {
  initial: string[];
}

const Harness = ({ initial }: HarnessProps) => {
  const [allIds, setAllIds] = useState(initial);
  return (
    <>
      <output data-testid="value">{allIds.join('|')}</output>
      <AgentsList
        ids={allIds.filter((id) => !id.startsWith('toolsets/'))}
        allIds={allIds}
        onChange={setAllIds}
        transports={{}}
        onConfigure={vi.fn()}
      />
    </>
  );
};

// `t` returns the key without interpolation, so every row's buttons share a label;
// a row is found by the entity name it shows, and its buttons are looked up inside it.
const getRow = (name: string) =>
  [...dom.container.querySelectorAll('li')].find((li) => li.textContent?.includes(name));
const getDetailsButton = (name: string) => {
  const row = getRow(name);
  return row ? getButton(ApplicationEditorI18nKeys.AddOnsDetails, row) : undefined;
};
const getRemoveButton = (name: string) => {
  const row = getRow(name);
  return row ? getButton(ApplicationEditorI18nKeys.AddOnsRemove, row) : undefined;
};

// The status line is the details button's accessible description.
const getStatus = (name: string) => {
  const describedBy = getDetailsButton(name)?.getAttribute('aria-describedby');
  return describedBy ? document.getElementById(describedBy) : null;
};

const render = async (initial: string[]) => {
  await act(async () => {
    dom.root.render(<Harness initial={initial} />);
  });
};

afterEach(() => {
  data.status = LoadStatus.Ready;
});

describe('AgentsList', () => {
  it('lists applications and models in order, with versions', async () => {
    await render([RESEARCH.id, GPT.id]);

    const items = [...dom.container.querySelectorAll('li')].map((li) => li.textContent);
    expect(items[0]).toContain('Research Agent');
    expect(items[0]).toContain('2.1');
    expect(items[1]).toContain('GPT-4o');
    expect(getDetailsButton('GPT-4o')).toBeTruthy();
  });

  it('describes an undeployed agent in the neutral style', async () => {
    await render([OFFLINE.id]);

    const status = getStatus('Offline');
    expect(status?.textContent).toBe(ApplicationEditorI18nKeys.AddOnsUndeployedApp);
    expect(status?.classList.contains('text-secondary')).toBe(true);
    expect(status?.classList.contains('text-error')).toBe(false);
  });

  it('names an application missing from the catalog after its id and flags it as an error', async () => {
    await render(['applications/public/gone__1.0']);

    expect(getDetailsButton('gone')).toBeTruthy();
    const status = getStatus('gone');
    expect(status?.textContent).toBe(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired);
    expect(status?.classList.contains('text-error')).toBe(true);
  });

  it('does not flag an application missing from the catalog while the catalog is loading', async () => {
    data.status = LoadStatus.Loading;
    await render(['applications/public/gone__1.0']);

    expect(getDetailsButton('gone')).toBeTruthy();
    expect(getStatus('gone')).toBeNull();
  });

  it('removes only that agent and keeps the toolsets', async () => {
    await render([RESEARCH.id, 'toolsets/public/figma', GPT.id]);

    await act(async () => getRemoveButton('Research Agent')?.click());

    expect(dom.container.querySelector('[data-testid="value"]')?.textContent).toBe(
      `toolsets/public/figma|${GPT.id}`,
    );
    expect(document.activeElement).toBe(getDetailsButton('GPT-4o'));
  });
});

describe('AgentsList details popup', () => {
  const clickAndWait = async (element?: Element) => {
    await act(async () => {
      (element as HTMLElement | undefined)?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  it('opens the activated agent and closes without changes', async () => {
    await render([RESEARCH.id, GPT.id]);

    await clickAndWait(getDetailsButton('GPT-4o'));
    expect(dom.container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(GPT.id);

    await clickAndWait(getButton('Close'));
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
    expect(dom.container.querySelector('[data-testid="value"]')?.textContent).toBe(
      `${RESEARCH.id}|${GPT.id}`,
    );
  });

  it('detaches the agent on Delete', async () => {
    await render([RESEARCH.id, GPT.id]);

    await clickAndWait(getDetailsButton('Research Agent'));
    await clickAndWait(getButton('Delete'));

    expect(dom.container.querySelector('[data-testid="value"]')?.textContent).toBe(GPT.id);
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
  });
});
