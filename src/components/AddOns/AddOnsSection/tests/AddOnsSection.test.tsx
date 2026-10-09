import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DialEntityType } from '@/types/dial-entities';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { AddOnSchemaKeys } from '@/form/quickApp2Form';
import type { DialModel, DialToolset } from '@/types/dial-entities';

import { AddOnsSection } from '../AddOnsSection';

const { searchParams } = vi.hoisted(() => ({ searchParams: new Map<string, string>() }));

const FIGMA: DialToolset = {
  id: 'toolsets/public/figma',
  reference: 'toolsets/public/figma',
  name: 'Figma',
  type: DialEntityType.Toolset,
};
const RESEARCH: DialModel = {
  id: 'applications/public/research',
  reference: 'applications/public/research',
  name: 'Research',
  type: DialEntityType.Application,
};

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/hooks/use-search-params', () => ({
  useSearchParams: () => ({ get: (key: string) => searchParams.get(key) ?? null }),
}));
vi.mock('@/hooks/use-add-on-entity-map', () => ({
  useAddOnEntityMap: () => ({ [FIGMA.id]: FIGMA, [RESEARCH.id]: RESEARCH }),
}));
vi.mock('@/components/AgentSkills/AgentSkillsFormSection/AgentSkillsFormSection', () => ({
  default: () => <section aria-label="Skills row" />,
}));
vi.mock('@/components/KnowledgeBase/KnowledgeBaseRow/KnowledgeBaseRow', () => ({
  default: () => <section aria-label="Knowledge base row" />,
}));
vi.mock('@/components/ConversationStarters/ConversationStartersRow/ConversationStartersRow', () => ({
  default: () => <section aria-label="Conversation starters row" />,
}));

interface ListStubProps {
  ids: string[];
  allIds: string[];
  onChange: (allIds: string[]) => void;
}

vi.mock('@/components/Toolsets/ToolsetsList/ToolsetsList', () => ({
  default: ({ ids, allIds, onChange }: ListStubProps) => (
    <ul aria-label="Toolsets list">
      {ids.map((id) => (
        <li key={id}>
          <button type="button" onClick={() => onChange(allIds.filter((x) => x !== id))}>
            Remove {id}
          </button>
        </li>
      ))}
    </ul>
  ),
}));
vi.mock('@/components/Agents/AgentsList/AgentsList', () => ({
  default: ({ ids }: ListStubProps) => (
    <ul aria-label="Agents list">
      {ids.map((id) => (
        <li key={id}>{id}</li>
      ))}
    </ul>
  ),
}));
vi.mock('@/components/Toolsets/AddToolsetsModal/AddToolsetsModal', () => ({
  AddToolsetsModal: () => <div role="dialog" aria-label="Add toolset" />,
}));
vi.mock('@/components/Agents/AddAgentsModal/AddAgentsModal', () => ({
  AddAgentsModal: () => <div role="dialog" aria-label="Add agent" />,
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  searchParams.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const entry = (id: string) => ({ [AddOnSchemaKeys.id]: id });

const renderSection = async ({
  ids = [] as string[],
  isReadonly = false,
  onAgentsChange = vi.fn(),
}: { ids?: string[]; isReadonly?: boolean; onAgentsChange?: (ids: string[]) => void } = {}) => {
  await act(async () => {
    root.render(
      <AddOnsSection
        agentSkills={[]}
        onAgentSkillsChange={vi.fn()}
        isReadonly={isReadonly}
        addOns={ids.map(entry)}
        onAgentsChange={onAgentsChange}
        onConfigureAgent={vi.fn()}
        documentRelativeUrl={[]}
        onAddDocuments={vi.fn()}
        onRemoveDocument={vi.fn()}
        conversationStarters={{
          starters: [],
          autoSubmit: true,
          chatMessageInputDisabled: false,
        }}
        onConversationStartersSave={vi.fn()}
      />,
    );
    // Let the lazily loaded pickers resolve.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const getByAriaLabel = (label: string) =>
  [...container.querySelectorAll('[aria-label]')].find(
    (element) => element.getAttribute('aria-label') === label,
  );

const getHeadings = () => [...container.querySelectorAll('h3')].map((h) => h.textContent);

const getAddButtons = () =>
  [...container.querySelectorAll('button')].filter((button) => button.textContent === 'Add');

const clickAndWait = async (element?: Element) => {
  await act(async () => {
    (element as HTMLElement | undefined)?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('AddOnsSection', () => {
  it('renders Skills, Toolsets, Agents, Knowledge base and Conversation starters in that order', async () => {
    await renderSection();

    expect(container.querySelector('section[aria-label="Add-ons"]')).toBeTruthy();
    expect(getHeadings()).toEqual([QuickAppEditorI18nKeys.Toolsets, QuickAppEditorI18nKeys.Agents]);

    const order = [
      getByAriaLabel('Skills row'),
      container.querySelector('h3'),
      container.querySelectorAll('h3')[1],
      getByAriaLabel('Conversation starters row'),
    ];
    for (let i = 1; i < order.length; i += 1) {
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('shows each empty row its own description', async () => {
    await renderSection();

    expect(container.textContent).toContain(QuickAppEditorI18nKeys.ToolsetsDescription);
    expect(container.textContent).toContain(QuickAppEditorI18nKeys.AgentsDescription);
  });

  it('splits the entries between the Toolsets and Agents rows', async () => {
    await renderSection({ ids: [RESEARCH.id, FIGMA.id, 'toolsets/public/old', 'gpt-x'] });

    expect(getByAriaLabel('Toolsets list')?.textContent).toBe(
      `Remove ${FIGMA.id}Remove toolsets/public/old`,
    );
    expect(getByAriaLabel('Agents list')?.textContent).toBe(`${RESEARCH.id}gpt-x`);
    // A populated row hides its description; the other one keeps it.
    await renderSection({ ids: [FIGMA.id] });
    expect(container.textContent).not.toContain(QuickAppEditorI18nKeys.ToolsetsDescription);
    expect(container.textContent).toContain(QuickAppEditorI18nKeys.AgentsDescription);
  });

  it('hands back the full id list when a toolset is removed', async () => {
    const onAgentsChange = vi.fn();
    await renderSection({ ids: [RESEARCH.id, FIGMA.id], onAgentsChange });

    await clickAndWait(
      [...container.querySelectorAll('button')].find((b) => b.textContent === `Remove ${FIGMA.id}`),
    );

    expect(onAgentsChange).toHaveBeenCalledWith([RESEARCH.id]);
  });

  it('opens Add toolset and Add agent from their row headers', async () => {
    await renderSection();
    const [toolsetsAdd, agentsAdd] = getAddButtons();

    await clickAndWait(toolsetsAdd);
    expect(getByAriaLabel('Add toolset')).toBeTruthy();

    await clickAndWait(agentsAdd);
    expect(getByAriaLabel('Add agent')).toBeTruthy();
  });

  it('opens Add agent on load from the agentsAndToolsetsModal deep link', async () => {
    searchParams.set('agentsAndToolsetsModal', '1');
    await renderSection();

    expect(getByAriaLabel('Add agent')).toBeTruthy();
    expect(getByAriaLabel('Add toolset')).toBeUndefined();
  });

  it('keeps both pickers closed in a read-only application, even with the deep link', async () => {
    searchParams.set('agentsAndToolsetsModal', '1');
    await renderSection({ isReadonly: true });

    const buttons = getAddButtons();
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      // With a tooltip the kit marks a disabled button aria-disabled (not native
      // `disabled`) so the tooltip still opens; either way it must not act.
      expect(button.disabled || button.getAttribute('aria-disabled') === 'true').toBe(true);
      await clickAndWait(button);
    }
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not render a JSON control for toolsets or agents', async () => {
    await renderSection({ ids: [FIGMA.id, RESEARCH.id] });

    expect(container.textContent).not.toContain('JSON');
    expect(container.querySelector('[role="switch"]')).toBeNull();
  });
});
