import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AdvancedSettingsSection from '../AdvancedSettingsSection';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/components/common/FormCollapsibleSection', () => ({
  FormCollapsibleSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  Switch: ({
    isOn,
    onChange,
    disabled,
  }: {
    isOn: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onChange(!isOn)}>
      {String(isOn)}
    </button>
  ),
}));

const TestForm = () => {
  const [value, setValue] = useState(true);
  return <AdvancedSettingsSection value={value} onChange={setValue} isReadonly={false} />;
};

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

describe('AdvancedSettingsSection', () => {
  it('uses the controlled timestamp value and change callback', () => {
    act(() => root.render(<TestForm />));

    const toggle = container.querySelector('button') as HTMLButtonElement;
    expect(toggle.textContent).toBe('true');

    act(() => {
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggle.textContent).toBe('false');
  });
});
