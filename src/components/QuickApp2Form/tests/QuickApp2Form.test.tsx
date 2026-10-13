import { describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import { QuickApp2Form } from '../QuickApp2Form';

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
vi.mock('@/components/AddOns/AddOnsSection/AddOnsSection', () => ({
  default: () => (
    <section aria-label="Add-ons">
      <button type="button">Add Skills</button>
      <button type="button">Add Toolsets</button>
      <button type="button">Add Agents</button>
    </section>
  ),
}));
vi.mock('@/components/AgentSkills/AgentSkillsFormSection/AgentSkillsFormSection', () => ({
  default: () => null,
}));

const dom = setupTestRoot();

describe('QuickApp2Form layout', () => {
  it('places the standalone Instructions and Configuration areas in the responsive form grid', () => {
    dom.render(<QuickApp2Form onSave={vi.fn()} onDirtyChange={vi.fn()} onModelReady={vi.fn()} />);

    const form = dom.container.querySelector('form');
    expect(form?.className).toContain('grid-cols-1');
    expect(form?.className).toContain('desktop:grid-cols-[minmax(0,1fr)_minmax(280px,440px)]');
    expect(dom.container.querySelector('[aria-label="Instructions"]')).toBeTruthy();
    expect(dom.container.querySelector('[aria-label="Orchestrator"]')).toBeNull();
    expect(dom.container.querySelector('[aria-label="Configuration"]')).toBeTruthy();
    expect(dom.container.textContent).toContain('Model Temperature Process files');
    expect(dom.container.querySelector('[aria-label="Instructions"]')?.textContent).toBe(
      'Instructions editor',
    );
    expect(dom.container.querySelector('[aria-label="Configuration"]')?.textContent).toBe(
      'Model Temperature Process files',
    );
  });

  it('places Add-ons immediately after Instructions and keeps its add actions visible', () => {
    dom.render(<QuickApp2Form onSave={vi.fn()} onDirtyChange={vi.fn()} onModelReady={vi.fn()} />);

    const primaryColumn = dom.container.querySelector('form > div');
    const sections = Array.from(primaryColumn?.querySelectorAll('section') ?? []);
    const instructionIndex = sections.findIndex(
      (section) => section.getAttribute('aria-label') === 'Instructions',
    );
    const addOnsIndex = sections.findIndex(
      (section) => section.getAttribute('aria-label') === 'Add-ons',
    );

    expect(addOnsIndex).toBe(instructionIndex + 1);
    expect(dom.container.querySelector('section[aria-label="Add-ons"] button')).toBeTruthy();
  });
});
