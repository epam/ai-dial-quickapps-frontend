import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import EditJsonLink from '../EditJsonLink';

vi.mock('@epam/ai-dial-ui-kit', () => ({
  ElementSize: { Small: 'small' },
  DIAL_ICON_SIZE: { SM: 16 },
  DIAL_KIT_ICON_STROKE: 1.5,
  LinkButton: ({
    label,
    iconBefore,
    onClick,
  }: {
    label: string;
    iconBefore: ReactNode;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {iconBefore}
      {label}
    </button>
  ),
}));

const dom = setupTestRoot();

describe('EditJsonLink', () => {
  it('renders the translated label with a decorative icon and reports clicks', () => {
    const onClick = vi.fn();
    dom.render(<EditJsonLink onClick={onClick} />);

    const button = getButton(ApplicationEditorI18nKeys.EditJson, dom.container);
    expect(button?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
