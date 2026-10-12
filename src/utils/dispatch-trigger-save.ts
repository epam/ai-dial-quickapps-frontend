import { DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import type { TriggerSaveEventDetail } from '@/types/editor-messages';

/** Asks the mounted form to save, through the window-level trigger-save event. */
export const dispatchTriggerSave = (detail: TriggerSaveEventDetail) => {
  window.dispatchEvent(new CustomEvent(DIAL_EDITOR_TRIGGER_SAVE_EVENT, { detail }));
};
