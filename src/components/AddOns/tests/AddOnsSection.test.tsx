import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AddOnsSection } from '../AddOnsSection';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/components/AgentSkills/AgentSkillsFormSection', () => ({
  default: () => (
    <section aria-label="Skills row">
      <button type="button">Add Skills</button>
    </section>
  ),
}));
vi.mock('@/components/ContextAndTools/AgentsAndToolsetsField', () => ({
  AgentsAndToolsetsField: () => (
    <section aria-label="Agents & Toolsets row">
      <button type="button">Add Agents & Toolsets</button>
    </section>
  ),
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

describe('AddOnsSection', () => {
  it('renders the Add-ons heading and both add-on rows without collapsible controls', () => {
    act(() => {
      root.render(
        <AddOnsSection
          control={null as never}
          errors={{}}
          isReadonly={false}
          agentsAndToolsets={[]}
          agentsAndToolsetsJson="[]"
          isJsonView={false}
          onAgentsChange={vi.fn()}
          onJsonChange={vi.fn()}
          onSwitchToJsonView={vi.fn()}
          onSwitchToSimpleView={vi.fn()}
          onDiscardJson={vi.fn()}
          onConfigureAgent={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('section[aria-label="Add-ons"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Skills row"]')).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll('section')).some(
        (section) => section.getAttribute('aria-label') === 'Agents & Toolsets row',
      ),
    ).toBe(true);
    expect(container.querySelectorAll('button')).toHaveLength(2);
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('keeps translated Add actions keyboard reachable', () => {
    act(() => {
      root.render(
        <AddOnsSection
          control={null as never}
          errors={{}}
          isReadonly={false}
          agentsAndToolsets={[]}
          agentsAndToolsetsJson="[]"
          isJsonView={false}
          onAgentsChange={vi.fn()}
          onJsonChange={vi.fn()}
          onSwitchToJsonView={vi.fn()}
          onSwitchToSimpleView={vi.fn()}
          onDiscardJson={vi.fn()}
          onConfigureAgent={vi.fn()}
        />,
      );
    });

    const addButtons = [...container.querySelectorAll('button')];
    expect(addButtons).toHaveLength(2);
    expect(addButtons.every((button) => !button.disabled && button.tabIndex >= 0)).toBe(true);
  });

  it('matches the target card spacing and typography hierarchy', () => {
    act(() => {
      root.render(
        <AddOnsSection
          control={null as never}
          errors={{}}
          isReadonly={false}
          agentsAndToolsets={[]}
          agentsAndToolsetsJson="[]"
          isJsonView={false}
          onAgentsChange={vi.fn()}
          onJsonChange={vi.fn()}
          onSwitchToJsonView={vi.fn()}
          onSwitchToSimpleView={vi.fn()}
          onDiscardJson={vi.fn()}
          onConfigureAgent={vi.fn()}
        />,
      );
    });

    const section = container.querySelector('section[aria-label="Add-ons"]');
    const rows = section?.querySelector('div.gap-10');
    const agentsTitle = [...(section?.querySelectorAll('h3') ?? [])].find(
      (heading) => heading.textContent === 'Agents & Toolsets',
    );

    expect(section?.querySelector('h2 > span')?.className).toContain('dial-h3-text');
    expect(rows?.className).toContain('gap-10');
    expect(agentsTitle?.className).toContain('dial-small-semi-text');
    expect(section?.querySelector('p.dial-small-text')).toBeTruthy();
  });

  it('keeps both rows present when selections are populated', () => {
    act(() => {
      root.render(
        <AddOnsSection
          control={null as never}
          errors={{}}
          isReadonly={false}
          agentsAndToolsets={[{ id: 'toolset-1' }] as never}
          agentsAndToolsetsJson='[{"name":"toolset-1"}]'
          isJsonView={false}
          onAgentsChange={vi.fn()}
          onJsonChange={vi.fn()}
          onSwitchToJsonView={vi.fn()}
          onSwitchToSimpleView={vi.fn()}
          onDiscardJson={vi.fn()}
          onConfigureAgent={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[aria-label="Skills row"]')).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll('section')).some(
        (section) => section.getAttribute('aria-label') === 'Agents & Toolsets row',
      ),
    ).toBe(true);
  });
});
