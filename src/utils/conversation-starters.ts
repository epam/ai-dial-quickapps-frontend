import type { Modifier } from '@dnd-kit/core';
import { nanoid } from 'nanoid';

import { STARTER_TITLE_MAX_LENGTH } from '@/constants/conversation-starters';
import {
  StarterSelectionBehavior,
  type StarterField,
  type StarterWithId,
} from '@/types/conversation-starters';
import type { ConversationStarter } from '@/types/quick-apps';

const createEmptyStarter = (): StarterWithId => ({ id: nanoid(), title: '', text: '' });

export const isSavedVisibleStarter = (starter: ConversationStarter): boolean =>
  !!(starter.title.trim() || starter.text.trim());

export const hasCompleteStarter = (starters: ConversationStarter[]): boolean =>
  starters.some((starter) => starter.title.trim() && starter.text.trim());

const isTitleGrowthOverLimit = (previous: string, next: string) =>
  next.length > STARTER_TITLE_MAX_LENGTH && next.length > previous.length;

/**
 * Applies one input edit to a starter list: drops a leading whitespace typed into an empty field,
 * lets the title grow only up to the limit (a longer legacy title may still be shortened) and keeps
 * exactly one trailing blank row.
 */
export const updateStarterField = (
  starters: StarterWithId[],
  index: number,
  field: StarterField,
  value: string,
): StarterWithId[] => {
  const current = starters[index];
  if (!current) return starters;

  const nextValue = value.length === 1 ? value.trim() : value;
  if (field === 'title' && isTitleGrowthOverLimit(current.title, nextValue)) return starters;

  const updated = starters.map((starter, i) =>
    i === index ? { ...starter, [field]: nextValue } : starter,
  );
  const isLastRow = index === updated.length - 1;

  return isLastRow && isSavedVisibleStarter(updated[index])
    ? [...updated, createEmptyStarter()]
    : updated;
};

export const removeStarter = (starters: StarterWithId[], index: number): StarterWithId[] => {
  if (index < 0 || index >= starters.length - 1) return starters;
  return starters.filter((_, i) => i !== index);
};

/** Moves a starter by id; the trailing blank row can neither be moved nor be a drop target. */
export const moveStarter = (
  starters: StarterWithId[],
  activeId: string,
  overId: string,
): StarterWithId[] => {
  const lastIndex = starters.length - 1;
  const from = starters.findIndex((starter) => starter.id === activeId);
  const to = starters.findIndex((starter) => starter.id === overId);

  if (from < 0 || to < 0 || from === to || from === lastIndex || to === lastIndex) return starters;
  const reordered = [...starters];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
};

export const getStarterSelectionBehavior = (autoSubmit: boolean): StarterSelectionBehavior =>
  autoSubmit ? StarterSelectionBehavior.SendPrompt : StarterSelectionBehavior.PopulateInput;

export const getAutoSubmit = (behavior: string): boolean =>
  behavior === StarterSelectionBehavior.SendPrompt;

/** dnd-kit modifier: starters only move up and down. */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
