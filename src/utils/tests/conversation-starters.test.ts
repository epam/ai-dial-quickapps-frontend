import { describe, expect, it } from 'vitest';

import { StarterSelectionBehavior, type StarterWithId } from '@/types/conversation-starters';
import {
  getAutoSubmit,
  getStarterSelectionBehavior,
  hasCompleteStarter,
  isSavedVisibleStarter,
  moveStarter,
  removeStarter,
  updateStarterField,
} from '@/utils/conversation-starters';

const starter = (id: string, title = '', text = ''): StarterWithId => ({ id, title, text });

const blank = () => starter('blank');

describe('updateStarterField', () => {
  it('appends a blank row when the last row becomes non-blank', () => {
    const result = updateStarterField([blank()], 0, 'title', 'Hi');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'blank', title: 'Hi', text: '' });
    expect(result[1]).toMatchObject({ title: '', text: '' });
  });

  it('does not append when a non-last row changes', () => {
    const result = updateStarterField([starter('a', 'A'), blank()], 0, 'text', 'Prompt');

    expect(result).toEqual([starter('a', 'A', 'Prompt'), blank()]);
  });

  it('discards a leading whitespace typed into an empty field', () => {
    const result = updateStarterField([blank()], 0, 'text', ' ');

    expect(result).toEqual([blank()]);
  });

  it('stops the title at 30 characters', () => {
    const thirty = 'x'.repeat(30);
    const starters = [starter('a', thirty), blank()];

    expect(updateStarterField(starters, 0, 'title', `${thirty}y`)).toBe(starters);
  });

  it('does not limit the prompt', () => {
    const long = 'p'.repeat(200);

    expect(updateStarterField([starter('a', 'A'), blank()], 0, 'text', long)[0].text).toBe(long);
  });

  it('lets a legacy over-limit title shrink but not grow', () => {
    const legacy = 'x'.repeat(42);
    const starters = [starter('a', legacy), blank()];

    expect(updateStarterField(starters, 0, 'title', `${legacy}y`)).toBe(starters);
    expect(updateStarterField(starters, 0, 'title', legacy.slice(0, 41))[0].title).toHaveLength(41);
  });
});

describe('removeStarter', () => {
  it('removes a non-trailing row', () => {
    expect(removeStarter([starter('a', 'A'), blank()], 0)).toEqual([blank()]);
  });

  it('ignores the trailing row', () => {
    const starters = [starter('a', 'A'), blank()];

    expect(removeStarter(starters, 1)).toBe(starters);
  });
});

describe('moveStarter', () => {
  const list = [starter('a', 'A'), starter('b', 'B'), starter('c', 'C'), blank()];

  it('moves a starter to the target position', () => {
    expect(moveStarter(list, 'b', 'a').map(({ id }) => id)).toEqual(['b', 'a', 'c', 'blank']);
    expect(moveStarter(list, 'a', 'c').map(({ id }) => id)).toEqual(['b', 'c', 'a', 'blank']);
  });

  it('refuses to move the trailing row or drop onto it', () => {
    expect(moveStarter(list, 'blank', 'a')).toBe(list);
    expect(moveStarter(list, 'a', 'blank')).toBe(list);
  });

  it('ignores unknown ids and same-position drops', () => {
    expect(moveStarter(list, 'x', 'a')).toBe(list);
    expect(moveStarter(list, 'a', 'a')).toBe(list);
  });
});

describe('starter predicates', () => {
  it('treats a starter with a title or a prompt as saved-visible', () => {
    expect(isSavedVisibleStarter(starter('a', 'A'))).toBe(true);
    expect(isSavedVisibleStarter(starter('a', '', 'P'))).toBe(true);
    expect(isSavedVisibleStarter(starter('a', ' ', ' '))).toBe(false);
  });

  it('requires both title and prompt for a complete starter', () => {
    expect(hasCompleteStarter([starter('a', 'A'), starter('b', '', 'P')])).toBe(false);
    expect(hasCompleteStarter([starter('a', 'A', 'P')])).toBe(true);
  });
});

describe('starter selection behaviour', () => {
  it('maps to and from autoSubmit', () => {
    expect(getStarterSelectionBehavior(true)).toBe(StarterSelectionBehavior.SendPrompt);
    expect(getStarterSelectionBehavior(false)).toBe(StarterSelectionBehavior.PopulateInput);
    expect(getAutoSubmit(StarterSelectionBehavior.SendPrompt)).toBe(true);
    expect(getAutoSubmit(StarterSelectionBehavior.PopulateInput)).toBe(false);
  });
});
