import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentOrToolsetSchemaKeys } from '@/form/quickApp2Form';

import { AgentsAndToolsetsField } from '../AgentsAndToolsetsField';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ modelsMap: {}, toolsetsMap: {}, mcpAgentsMap: {} }),
}));
vi.mock('@/components/common/AgentAndToolsetSelector/AgentAndToolsetSelector', () => ({
  AgentAndToolsetSelector: ({ value }: { value: string[] }) => (
    <ul aria-label="Selected agents and toolsets">
      {value.map((id) => (
        <li key={id}>{id}</li>
      ))}
    </ul>
  ),
}));
vi.mock('@/components/common/AgentAndToolsetSelector/EntityInfoModal', () => ({
  EntityInfoModal: () => null,
}));
vi.mock('../DialAppConfigurationModal', () => ({ DialAppConfigurationModal: () => null }));

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

const renderField = (readonly: boolean) => {
  act(() => {
    root.render(
      <AgentsAndToolsetsField
        agentsAndToolsets={[{ [AgentOrToolsetSchemaKeys.id]: 'inline-calculator' }]}
        onAgentsChange={vi.fn()}
        onConfigureAgent={vi.fn()}
        readonly={readonly}
        isSelectModalOpen={false}
        onSelectModalOpenChange={vi.fn()}
      />,
    );
  });
};

describe('AgentsAndToolsetsField', () => {
  it.each([false, true])(
    'shows selected items without any JSON view controls (read-only: %s)',
    (readonly) => {
      renderField(readonly);

      expect(container.textContent).toContain('inline-calculator');
      expect(container.textContent).not.toContain('JSON');
      expect(container.textContent).not.toContain('Discard');
      expect(container.querySelector('[role="switch"]')).toBeNull();
    },
  );
});
