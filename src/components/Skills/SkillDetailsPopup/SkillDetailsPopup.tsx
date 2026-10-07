import {
  ButtonAppearance,
  ButtonVariant,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  EntityIdentity,
  EntityType,
  NoDataContent,
  Popup,
  PopupSize,
  Tabs,
} from '@epam/ai-dial-ui-kit';
import { IconTrash } from '@tabler/icons-react';
import { FC, useCallback, useMemo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import type { DialSkill } from '@/types/dial-entities';
import { SkillDetailsTabId } from '@/types/skill-details';
import { Translation } from '@/types/translation';

import { SkillDetailsTab } from './SkillDetailsTab';
import { SkillOverviewTab } from './SkillOverviewTab';

const AVATAR_SIZE = 40;

export interface SkillDetailsPopupProps {
  skillId: string;
  /** Undefined when the attached skill is no longer in the catalog. */
  skill?: DialSkill;
  /** Shown while the skill is missing from the catalog. */
  fallbackName: string;
  isReadonly: boolean;
  onRemove: (id: string) => void;
  onClose: () => void;
}

/**
 * A skill's details: its rendered manifest and metadata, plus Delete, which
 * detaches the skill from this application (the skill itself is untouched).
 */
export const SkillDetailsPopup: FC<SkillDetailsPopupProps> = ({
  skillId,
  skill,
  fallbackName,
  isReadonly,
  onRemove,
  onClose,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const [activeTab, setActiveTab] = useState<string>(SkillDetailsTabId.Details);

  const name = skill?.name ?? fallbackName;

  const tabs = useMemo(
    () => [
      { id: SkillDetailsTabId.Details, label: t(QuickAppEditorI18nKeys.SkillDetailsTab) },
      { id: SkillDetailsTabId.Overview, label: t(QuickAppEditorI18nKeys.SkillOverviewTab) },
    ],
    [t],
  );

  const handleRemove = useCallback(() => {
    onRemove(skillId);
    onClose();
  }, [onRemove, onClose, skillId]);

  const additionalButtons = useMemo(
    () =>
      isReadonly
        ? undefined
        : [
            {
              label: t(QuickAppEditorI18nKeys.RemoveSkillFromApp),
              // Design: red (Danger) / Solid / Standard with a leading trash icon.
              variant: ButtonVariant.Danger,
              appearance: ButtonAppearance.Solid,
              iconBefore: <IconTrash size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />,
              onClick: handleRemove,
            },
          ],
    [isReadonly, t, handleRemove],
  );

  const mainButtons = useMemo(
    () => [
      {
        label: t(QuickAppEditorI18nKeys.Close),
        variant: ButtonVariant.Primary,
        appearance: ButtonAppearance.Link,
        onClick: onClose,
      },
    ],
    [t, onClose],
  );

  const renderPanel = () => {
    if (activeTab === SkillDetailsTabId.Details) return <SkillDetailsTab skill={skill} />;
    if (skill == null) return <NoDataContent title={t(QuickAppEditorI18nKeys.SkillUnavailable)} />;
    return <SkillOverviewTab skill={skill} />;
  };

  return (
    <Popup
      open
      ariaLabel={name}
      header={
        <EntityIdentity
          item={{ type: EntityType.Skill, name, version: skill?.version }}
          labels={{ type: t(QuickAppEditorI18nKeys.SkillTypeLabel) }}
          hasFeaturedTag={false}
          iconSize={AVATAR_SIZE}
          headingLevel={2}
          nameClassName="dial-body-semi-text"
          typeClassName="dial-tiny-semi-text"
        />
      }
      size={PopupSize.Lg}
      closeAriaLabel={tCommon(CommonI18nKeys.CloseDialog)}
      bodyClassName="flex max-h-[70vh] flex-col overflow-hidden px-6 pb-5"
      additionalButtons={additionalButtons}
      additionalButtonsOnLeft
      mainButtons={mainButtons}
      footerDivider
      onClose={onClose}
    >
      <Tabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        ariaLabel={name}
        className="shrink-0"
      />
      <div
        role="tabpanel"
        aria-label={tabs.find((tab) => tab.id === activeTab)?.label}
        className="min-h-0 flex-1 overflow-y-auto pt-4"
      >
        {renderPanel()}
      </div>
    </Popup>
  );
};
