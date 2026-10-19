import { act, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import { DialEntityType } from '@/types/dial-entities';
import { ApplicationStatus, type DialModel } from '@/types/dial-entities';

import AgentsList from '../AgentsList';

const makeAgent = (id: string, name: string, overrides: Partial<DialModel> = {}) =>
  ({ id, reference: id, name, type: DialEntityType.Application, ...overrides }) as DialModel;

const RESEARCH = makeAgent('applications/public/research', 'Research Agent', { version: '2.1' });
const GPT = makeAgent('gpt-4o', 'GPT-4o', { type: DialEntityType.Model });
const OFFLINE = makeAgent('applications/public/offline', 'Offline', {
  functionStatus: ApplicationStatus.Undeployed,
});

vi.mock('@/hooks/use-add-on-entity-map', () => ({
  useAddOnEntityMap: () => ({ [RESEARCH.id]: RESEARCH, [GPT.id]: GPT, [OFFLINE.id]: OFFLINE }),
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

const render = async (initial: string[]) => {
  await act(async () => {
    dom.root.render(<Harness initial={initial} />);
  });
};

describe('AgentsList', () => {
  it('lists applications and models in order, with versions', async () => {
    await render([RESEARCH.id, GPT.id]);

    const items = [...dom.container.querySelectorAll('li')].map((li) => li.textContent);
    expect(items[0]).toContain('Research Agent');
    expect(items[0]).toContain('2.1');
    expect(items[1]).toContain('GPT-4o');
    expect(getDetailsButton('GPT-4o')).toBeTruthy();
  });

  it('describes an undeployed agent', async () => {
    await render([OFFLINE.id]);

    expect(dom.container.textContent).toContain(ApplicationEditorI18nKeys.AddOnsUndeployedApp);
  });

  it('names an application missing from the catalog after its id and flags it', async () => {
    await render(['applications/public/gone__1.0']);

    expect(getDetailsButton('gone')).toBeTruthy();
    expect(dom.container.textContent).toContain(
      ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired,
    );
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
