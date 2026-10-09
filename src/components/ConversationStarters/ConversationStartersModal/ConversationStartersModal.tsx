import {
  ButtonAppearance,
  ButtonVariant,
  Input,
  Popup,
  PopupSize,
  RadioGroup,
  Switch,
} from '@epam/ai-dial-ui-kit';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FC, memo, useCallback, useMemo, useRef, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import {
  StarterSelectionBehavior,
  type ConversationStartersValues,
  type StarterField,
} from '@/types/conversation-starters';
import { Translation } from '@/types/translation';
import {
  getAutoSubmit,
  getStarterSelectionBehavior,
  hasCompleteStarter,
  moveStarter,
  removeStarter,
  restrictToVerticalAxis,
  updateStarterField,
} from '@/utils/conversation-starters';

import { SortableStarterRow } from '../SortableStarterRow/SortableStarterRow';

const MODIFIERS = [restrictToVerticalAxis];
// The kit Label is secondary tiny text by default, which reads as disabled; per design the setting
// labels are primary semibold whether or not the settings are enabled.
const SETTING_LABEL_CLASS_NAME = 'dial-small-semi-text text-primary';

export interface ConversationStartersModalProps {
  values: ConversationStartersValues;
  onSave: (values: ConversationStartersValues) => void;
  onClose: () => void;
}

const ConversationStartersModal: FC<ConversationStartersModalProps> = ({
  values,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  // Seeded once per mount; ConversationStartersRow mounts the modal only while it is open.
  const [draft, setDraft] = useState<ConversationStartersValues>(values);
  const isSettingsDisabled = !hasCompleteStarter(draft.starters);
  const settingsHint = isSettingsDisabled
    ? t(QuickAppEditorI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings)
    : undefined;
  // Escape both cancels a keyboard drag and dismisses the popup; while a drag is active (and for the
  // rest of the event that ended it) the popup must stay open.
  const isDraggingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const starterIds = useMemo(() => draft.starters.map((starter) => starter.id), [draft.starters]);

  const accessibility = useMemo(() => {
    const total = Math.max(starterIds.length - 1, 0);
    const getPosition = (id?: UniqueIdentifier) => starterIds.indexOf(String(id)) + 1;
    const announcements: Announcements = {
      onDragStart: ({ active }) =>
        t(QuickAppEditorI18nKeys.StarterPickedUp, { position: getPosition(active.id), total }),
      onDragOver: ({ over }) =>
        over
          ? t(QuickAppEditorI18nKeys.StarterMovedOver, { position: getPosition(over.id), total })
          : undefined,
      onDragEnd: ({ active, over }) =>
        t(QuickAppEditorI18nKeys.StarterDropped, {
          position: getPosition(over?.id ?? active.id),
          total,
        }),
      onDragCancel: () => t(QuickAppEditorI18nKeys.StarterDragCancelled),
    };

    return {
      announcements,
      screenReaderInstructions: { draggable: t(QuickAppEditorI18nKeys.StarterDragInstructions) },
    };
  }, [starterIds, t]);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const releaseDragging = useCallback(() => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      releaseDragging();
      if (!over) return;
      setDraft((current) => ({
        ...current,
        starters: moveStarter(current.starters, String(active.id), String(over.id)),
      }));
    },
    [releaseDragging],
  );

  const handleDismiss = useCallback(() => {
    if (isDraggingRef.current) return;
    onClose();
  }, [onClose]);

  const behaviorItems = useMemo(
    () => [
      {
        value: StarterSelectionBehavior.SendPrompt,
        label: t(QuickAppEditorI18nKeys.SendPromptToTheChat),
      },
      {
        value: StarterSelectionBehavior.PopulateInput,
        label: t(QuickAppEditorI18nKeys.PopulatePromptInTheChatInput),
      },
    ],
    [t],
  );

  const handleStarterChange = useCallback(
    (index: number, field: StarterField, value: string) =>
      setDraft((current) => ({
        ...current,
        starters: updateStarterField(current.starters, index, field, value),
      })),
    [],
  );

  const handleStarterDelete = useCallback(
    (index: number) =>
      setDraft((current) => ({ ...current, starters: removeStarter(current.starters, index) })),
    [],
  );

  const handleIntroTextChange = useCallback(
    (value?: string) => setDraft((current) => ({ ...current, introText: value ?? '' })),
    [],
  );

  const handleChatInputDisabledChange = useCallback(
    (chatMessageInputDisabled: boolean) =>
      setDraft((current) => ({ ...current, chatMessageInputDisabled })),
    [],
  );

  const handleBehaviorChange = useCallback(
    (behavior: string) =>
      setDraft((current) => ({ ...current, autoSubmit: getAutoSubmit(behavior) })),
    [],
  );

  const handleSave = useCallback(() => {
    onSave(draft);
    onClose();
  }, [draft, onClose, onSave]);

  return (
    <Popup
      open
      size={PopupSize.Md}
      className="md:max-w-[1000px]"
      header={t(QuickAppEditorI18nKeys.SetUpConversationStarters)}
      closeAriaLabel={t(QuickAppEditorI18nKeys.CloseConversationStarters)}
      headerDivider
      footerDivider
      onClose={handleDismiss}
      bodyClassName="max-w-full px-6 py-4"
      additionalButtons={[
        {
          label: tCommon(CommonI18nKeys.Cancel),
          onClick: onClose,
          variant: ButtonVariant.Primary,
          appearance: ButtonAppearance.Link,
        },
      ]}
      mainButtons={[
        {
          label: t(QuickAppEditorI18nKeys.Save),
          variant: ButtonVariant.Neutral,
          onClick: handleSave,
        },
      ]}
    >
      <div className="flex flex-col gap-6 text-start">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={MODIFIERS}
          accessibility={accessibility}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={releaseDragging}
        >
          <SortableContext items={starterIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {draft.starters.map((starter, index) => (
                <SortableStarterRow
                  key={starter.id}
                  starter={starter}
                  index={index}
                  isTrailing={index === draft.starters.length - 1}
                  onChange={handleStarterChange}
                  onDelete={handleStarterDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="dial-small-semi-text text-primary">
              {t(QuickAppEditorI18nKeys.Settings)}
            </h3>
            <p className="dial-tiny-text mt-1 text-secondary">
              {t(QuickAppEditorI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings)}
            </p>
          </div>

          <Input
            labelProps={{
              label: t(QuickAppEditorI18nKeys.IntroMessage),
              className: SETTING_LABEL_CLASS_NAME,
            }}
            placeholder={t(QuickAppEditorI18nKeys.EnterIntroText)}
            value={draft.introText ?? ''}
            onChange={handleIntroTextChange}
            disabled={isSettingsDisabled}
            tooltipText={settingsHint}
            containerClassName="w-full max-w-md"
          />

          <Switch
            isOn={draft.chatMessageInputDisabled}
            onChange={handleChatInputDisabledChange}
            disabled={isSettingsDisabled}
            labelProps={{
              label: t(QuickAppEditorI18nKeys.RequireStarterToStartNewChat),
              caption: settingsHint,
            }}
            caption={t(QuickAppEditorI18nKeys.RequireStarterToStartNewChatDescription)}
          />

          <RadioGroup
            labelProps={{
              label: t(QuickAppEditorI18nKeys.WhenStarterIsSelected),
              className: SETTING_LABEL_CLASS_NAME,
              caption: settingsHint,
            }}
            items={behaviorItems}
            value={getStarterSelectionBehavior(draft.autoSubmit)}
            onChange={handleBehaviorChange}
            disabled={isSettingsDisabled}
          />
        </div>
      </div>
    </Popup>
  );
};

export default memo(ConversationStartersModal);
