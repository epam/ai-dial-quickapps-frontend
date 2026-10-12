import { act, type FC } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useGridRowKeyboardSelect } from '@/hooks/use-grid-row-keyboard-select';
import { setupTestRoot } from '@/test-utils/test-root';

interface GridProps {
  onSelect: (rowId: string) => void;
}

const Grid: FC<GridProps> = ({ onSelect }) => {
  const handleKeyDown = useGridRowKeyboardSelect(onSelect);
  return (
    <div onKeyDown={handleKeyDown}>
      <div role="columnheader" tabIndex={0}>
        Name
      </div>
      <div role="row" {...{ 'row-id': 'models/gemini__1.0.3' }}>
        <div role="gridcell" tabIndex={0}>
          Gemini
        </div>
      </div>
    </div>
  );
};

const dom = setupTestRoot();

const pressKey = (selector: string, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    dom.container.querySelector(selector)?.dispatchEvent(event);
  });
  return event;
};

describe('useGridRowKeyboardSelect', () => {
  it.each(['Enter', ' '])('selects the row of the focused cell on %j', (key) => {
    const onSelect = vi.fn();
    dom.render(<Grid onSelect={onSelect} />);

    const event = pressKey('[role="gridcell"]', key);

    expect(onSelect).toHaveBeenCalledWith('models/gemini__1.0.3');
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores other keys', () => {
    const onSelect = vi.fn();
    dom.render(<Grid onSelect={onSelect} />);

    const event = pressKey('[role="gridcell"]', 'ArrowDown');

    expect(onSelect).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores keys pressed outside a row, such as on the column header', () => {
    const onSelect = vi.fn();
    dom.render(<Grid onSelect={onSelect} />);

    const event = pressKey('[role="columnheader"]', 'Enter');

    expect(onSelect).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
