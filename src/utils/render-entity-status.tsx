import { CaptionText, ErrorText } from '@epam/ai-dial-ui-kit';
import type { ReactNode } from 'react';

import { type EntityStatusMessage, EntityStatusSeverity } from '@/types/entity-status';

/**
 * The status line of an attached add-on row, as the `description` of the
 * catalog's `AddOnListItem`: a validation error asks the user to act, anything
 * else reads as a neutral caption. The row wraps it in the element its button
 * is described by, so the text is not announced (no `announce`).
 */
export const renderEntityStatus = (message?: EntityStatusMessage): ReactNode => {
  if (message == null) return undefined;

  if (message.severity === EntityStatusSeverity.Error) {
    return <ErrorText text={message.text} />;
  }

  return <CaptionText text={message.text} />;
};
