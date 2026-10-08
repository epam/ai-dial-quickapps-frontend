import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';

import { AddOnsSection } from '../AddOnsSection';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/hooks/use-search-params', () => ({
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock('@/components/AgentSkills/AgentSkillsFormSection', () => ({
  default: () => (
    <section aria-label="Skills row">
      <button type="button">Add Skills</button>
    </section>
  ),
}));
vi.mock('@/components/ContextAndTools/AgentsAndToolsetsField', () => ({
  AgentsAndToolsetsField: ({ isSelectModalOpen }: { isSelectModalOpen: boolean }) => (
    <section aria-label="Agents & Toolsets row">
      {isSelectModalOpen && <div role="dialog" aria-label="Agents & Toolsets modal" />}
    </section>
  ),
}));
vi.mock('@/components/KnowledgeBase/KnowledgeBaseRow', () => ({
  default: () => <section aria-label="Knowledge base row" />,
}));
vi.mock('@/components/ConversationStarters/ConversationStartersRow', () => ({
  default: () => <section aria-label="Conversation starters row" />,
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const renderSection = ({
  agentsAndToolsets = [] as never[],
  isReadonly = false,
}: { agentsAndToolsets?: never[]; isReadonly?: boolean } = {}) => {
  act(() => {
    root.render(
      <AddOnsSection
        agentSkills={[]}
        onAgentSkillsChange={vi.fn()}
        isReadonly={isReadonly}
        agentsAndToolsets={agentsAndToolsets}
        onAgentsChange={vi.fn()}
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
  });
};

const getByAriaLabel = (label: string) =>
  [...container.querySelectorAll('[aria-label]')].find(
    (element) => element.getAttribute('aria-label') === label,
  );

const getAgentsAddButton = () =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === 'Add');

describe('AddOnsSection', () => {
  it('renders the Add-ons heading and both add-on rows without collapsible controls', () => {
    renderSection();

    expect(container.querySelector('section[aria-label="Add-ons"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Skills row"]')).toBeTruthy();
    expect(getByAriaLabel('Agents & Toolsets row')).toBeTruthy();
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('renders the Knowledge base row before Conversation starters, after the other add-on rows', () => {
    renderSection();

    const rows = [...container.querySelectorAll('section[aria-label$="row"]')].map((row) =>
      row.getAttribute('aria-label'),
    );
    expect(rows).toEqual([
      'Skills row',
      'Agents & Toolsets row',
      'Knowledge base row',
      'Conversation starters row',
    ]);
  });

  it('keeps translated Add actions keyboard reachable', () => {
    renderSection();

    const addButtons = [...container.querySelectorAll('button')];
    expect(addButtons).toHaveLength(2);
    expect(addButtons.every((button) => !button.disabled && button.tabIndex >= 0)).toBe(true);
  });

  it('opens the Agents & Toolsets selection modal from the row header Add action', () => {
    renderSection();

    expect(container.querySelector('[role="dialog"]')).toBeNull();

    act(() => getAgentsAddButton()?.click());

    expect(getByAriaLabel('Agents & Toolsets modal')).toBeTruthy();
  });

  it('disables the Agents & Toolsets Add action in read-only mode', () => {
    renderSection({ isReadonly: true });

    // With a tooltip the kit marks a disabled button aria-disabled (not native
    // `disabled`) so the tooltip still opens; either way it must not act.
    const button = getAgentsAddButton();
    expect(button?.disabled || button?.getAttribute('aria-disabled') === 'true').toBe(true);

    act(() => button?.click());

    expect(getByAriaLabel('Agents & Toolsets modal')).toBeUndefined();
  });

  it('does not render a JSON control in the Agents & Toolsets row header', () => {
    renderSection({ agentsAndToolsets: [{ id: 'toolset-1' }] as never[] });

    expect(container.textContent).not.toContain('JSON');
    expect(container.querySelector('[role="switch"]')).toBeNull();
  });

  it('matches the target card spacing and typography hierarchy', () => {
    renderSection();

    const section = container.querySelector('section[aria-label="Add-ons"]');
    const rows = section?.querySelector('div.gap-7');
    const agentsTitle = [...(section?.querySelectorAll('h3') ?? [])].find(
      (heading) => heading.textContent === 'Agents & Toolsets',
    );

    expect(section?.querySelector('h2 > span')?.className).toContain('dial-h3-text');
    expect(rows?.className).toContain('gap-7');
    expect(agentsTitle?.className).toContain('dial-small-semi-text');
  });

  it('shows the Agents & Toolsets description only while the row is empty', () => {
    renderSection();
    expect(container.textContent).toContain(QuickAppEditorI18nKeys.ContextAndToolsDescription);

    renderSection({ agentsAndToolsets: [{ id: 'toolset-1' }] as never[] });
    expect(container.textContent).not.toContain(QuickAppEditorI18nKeys.ContextAndToolsDescription);
    expect(getByAriaLabel('Agents & Toolsets row')).toBeTruthy();
  });
});
