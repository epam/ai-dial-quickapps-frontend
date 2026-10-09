import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickApp2Form } from '../QuickApp2Form';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    app: { id: 'app', applicationProperties: {} },
    settings: {},
  }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({
    models: [],
    modelsMap: {},
    toolsets: [],
    toolsetsMap: {},
    mcpAgents: [],
    mcpAgentsMap: {},
    status: 'ready',
  }),
}));
vi.mock('@/components/InstructionsSection/InstructionsSection', () => ({
  default: () => <section aria-label="Instructions">Instructions editor</section>,
}));
vi.mock('@/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection', () => ({
  default: () => <aside aria-label="Configuration">Model Temperature Process files</aside>,
}));
vi.mock('@/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields', () => ({
  default: () => null,
}));
vi.mock('@/components/AddOns/AddOnsSection/AddOnsSection', () => ({
  default: () => (
    <section aria-label="Add-ons">
      <button type="button">Add Skills</button>
      <button type="button">Add Toolsets</button>
      <button type="button">Add Agents</button>
    </section>
  ),
}));
vi.mock('@/components/AgentSkills/AgentSkillsFormSection/AgentSkillsFormSection', () => ({ default: () => null }));

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

describe('QuickApp2Form layout', () => {
  it('places the standalone Instructions and Configuration areas in the responsive form grid', () => {
    act(() => {
      root.render(
        <QuickApp2Form
          onSave={vi.fn()}
          onDirtyChange={vi.fn()}
          onModelReady={vi.fn()}
        />,
      );
    });

    const form = container.querySelector('form');
    expect(form?.className).toContain('grid-cols-1');
    expect(form?.className).toContain(
      'desktop:grid-cols-[minmax(0,1fr)_minmax(280px,440px)]',
    );
    expect(container.querySelector('[aria-label="Instructions"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Orchestrator"]')).toBeNull();
    expect(container.querySelector('[aria-label="Configuration"]')).toBeTruthy();
    expect(container.textContent).toContain('Model Temperature Process files');
    expect(container.querySelector('[aria-label="Instructions"]')?.textContent).toBe(
      'Instructions editor',
    );
    expect(container.querySelector('[aria-label="Configuration"]')?.textContent).toBe(
      'Model Temperature Process files',
    );
  });

  it('places Add-ons immediately after Instructions and keeps its add actions visible', () => {
    act(() => {
      root.render(
        <QuickApp2Form
          onSave={vi.fn()}
          onDirtyChange={vi.fn()}
          onModelReady={vi.fn()}
        />,
      );
    });

    const primaryColumn = container.querySelector('form > div');
    const sections = Array.from(primaryColumn?.querySelectorAll('section') ?? []);
    const instructionIndex = sections.findIndex(
      (section) => section.getAttribute('aria-label') === 'Instructions',
    );
    const addOnsIndex = sections.findIndex(
      (section) => section.getAttribute('aria-label') === 'Add-ons',
    );

    expect(addOnsIndex).toBe(instructionIndex + 1);
    expect(container.querySelector('section[aria-label="Add-ons"] button')).toBeTruthy();
  });
});
