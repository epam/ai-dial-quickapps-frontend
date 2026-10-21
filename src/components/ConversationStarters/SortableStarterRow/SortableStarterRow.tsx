import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ButtonAppearance,
  ButtonVariant,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  IconButton,
  Input,
  mergeClasses,
} from '@epam/ai-dial-ui-kit';
import { IconGripVertical, IconTrashX } from '@tabler/icons-react';
import { FC } from 'react';

import { STARTER_TITLE_MAX_LENGTH } from '@/constants/conversation-starters';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';
import type { StarterField, StarterWithId } from '@/types/conversation-starters';

export interface SortableStarterRowProps {
  starter: StarterWithId;
  index: number;
  isTrailing: boolean;
  onChange: (index: number, field: StarterField, value: string) => void;
  onDelete: (index: number) => void;
}

export const SortableStarterRow: FC<SortableStarterRowProps> = ({
  starter,
  index,
  isTrailing,
  onChange,
  onDelete,
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: starter.id, disabled: isTrailing });
  const titleLength = starter.title.length;
  const isTitleOverLimit = titleLength > STARTER_TITLE_MAX_LENGTH;
  const handleName = starter.title.trim() || String(index + 1);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={mergeClasses(
        'flex items-center gap-1 rounded-xl bg-layer-base p-2 md:gap-2',
        isDragging && 'relative z-10 shadow-md',
      )}
    >
      {/* A bare grip, not a kit button: it must look like a drag affordance, yet stay a focusable
          native button so dnd-kit's keyboard sensor can pick the row up. */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t(ApplicationEditorI18nKeys.StartersReorder, { name: handleName })}
        disabled={isTrailing}
        className={mergeClasses(
          'flex shrink-0 items-center justify-center rounded-sm text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-focus',
          isTrailing
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-grab touch-none hover:text-primary',
        )}
      >
        <IconGripVertical
          size={DIAL_ICON_SIZE.MD}
          stroke={DIAL_KIT_ICON_STROKE}
          aria-hidden="true"
        />
      </button>
      <Input
        aria-label={t(ApplicationEditorI18nKeys.StartersButtonLabel)}
        placeholder={t(ApplicationEditorI18nKeys.StartersButtonLabel)}
        value={starter.title}
        onChange={(value) => onChange(index, 'title', value ?? '')}
        invalid={isTitleOverLimit}
        iconAfter={
          titleLength > 0 && (
            <span
              className={mergeClasses(
                'dial-small-text shrink-0',
                isTitleOverLimit ? 'text-error' : 'text-secondary',
              )}
            >
              {titleLength}/{STARTER_TITLE_MAX_LENGTH}
            </span>
          )
        }
        containerClassName="min-w-0 flex-1"
      />
      <Input
        aria-label={t(ApplicationEditorI18nKeys.StartersPromptPlaceholder)}
        placeholder={t(ApplicationEditorI18nKeys.StartersPromptPlaceholder)}
        value={starter.text}
        onChange={(value) => onChange(index, 'text', value ?? '')}
        containerClassName="min-w-0 flex-1"
      />
      <IconButton
        type="button"
        aria-label={t(ApplicationEditorI18nKeys.StartersDelete)}
        variant={ButtonVariant.Danger}
        appearance={ButtonAppearance.Ghost}
        icon={<IconTrashX size={DIAL_ICON_SIZE.MD} stroke={DIAL_KIT_ICON_STROKE} />}
        disabled={isTrailing}
        onClick={() => onDelete(index)}
        className="shrink-0"
      />
    </div>
  );
};
