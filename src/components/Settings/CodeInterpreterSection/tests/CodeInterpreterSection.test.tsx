import { describe, expect, it, vi } from 'vitest';

import { click } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';

import CodeInterpreterSection from '../CodeInterpreterSection';

const dom = setupTestRoot();

const getSwitch = () => dom.container.querySelector('[role="switch"]') as HTMLElement;

describe('CodeInterpreterSection', () => {
  it('renders the title and description', () => {
    dom.render(<CodeInterpreterSection isEnabled={false} onEnabledChange={vi.fn()} />);

    expect(dom.container.textContent).toContain(ApplicationEditorI18nKeys.CodeInterpreterTitle);
    expect(dom.container.textContent).toContain(
      ApplicationEditorI18nKeys.CodeInterpreterDescription,
    );
  });

  it('reports the toggled value', () => {
    const onEnabledChange = vi.fn();
    dom.render(<CodeInterpreterSection isEnabled={false} onEnabledChange={onEnabledChange} />);

    click(getSwitch());

    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });
});
