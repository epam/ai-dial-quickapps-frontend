import { describe, expect, it } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';
import { EntityStatusSeverity } from '@/types/entity-status';
import { renderEntityStatus } from '@/utils/render-entity-status';

const dom = setupTestRoot();

const getLine = (text: string) =>
  [...dom.container.querySelectorAll('*')].find((element) => element.textContent === text);

describe('renderEntityStatus', () => {
  it('renders a status that needs action as a validation error', () => {
    dom.render(
      <>{renderEntityStatus({ text: 'Needs removal', severity: EntityStatusSeverity.Error })}</>,
    );

    expect(getLine('Needs removal')?.classList.contains('text-error')).toBe(true);
  });

  it('renders an informational status as a neutral caption', () => {
    dom.render(
      <>
        {renderEntityStatus({ text: 'Logged out toolset.', severity: EntityStatusSeverity.Info })}
      </>,
    );

    const line = getLine('Logged out toolset.');
    expect(line?.classList.contains('text-secondary')).toBe(true);
    expect(line?.classList.contains('text-error')).toBe(false);
  });

  it('renders nothing without a status', () => {
    dom.render(<>{renderEntityStatus(undefined)}</>);

    expect(dom.container.textContent).toBe('');
  });
});
