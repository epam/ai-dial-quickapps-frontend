import {
  ButtonAppearance,
  ButtonVariant,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  EntityIdentity,
  EntityType,
  Popup,
  PopupSize,
  Tabs,
} from '@epam/ai-dial-ui-kit';
import { IconFolder, IconTrash } from '@tabler/icons-react';
import { FC, ReactNode, useCallback, useMemo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';

const AVATAR_SIZE = 40;

export interface AddOnDetailsTab {
  id: string;
  label: string;
  panel: ReactNode;
}

export interface AddOnDetailsPopupProps {
  entityType: EntityType;
  /** The type caption, e.g. "Toolset". */
  typeLabel: string;
  name: string;
  version?: string;
  iconUrl?: string;
  /** Folder path segments (scope label first); the line is hidden when empty. */
  folder: string[];
  /** Overlaid on the avatar's bottom-end corner, e.g. the logged-out badge. */
  avatarBadge?: ReactNode;
  /** Buttons under the header, e.g. Log in or Connection. */
  actions?: ReactNode;
  /** A status message shown above the tabs. */
  banner?: ReactNode;
  tabs: AddOnDetailsTab[];
  /** Hides Delete; only Close is offered. */
  isReadonly: boolean;
  deleteLabel: string;
  onTabChange?: (tabId: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * The shell shared by the toolset and agent details popups: identity header
 * with the folder line, an optional action row and banner, the tabs, and the
 * Delete (detach from the app) / Close footer. Each popup supplies its own
 * tabs and actions.
 */
export const AddOnDetailsPopup: FC<AddOnDetailsPopupProps> = ({
  entityType,
  typeLabel,
  name,
  version,
  iconUrl,
  folder,
  avatarBadge,
  actions,
  banner,
  tabs,
  isReadonly,
  deleteLabel,
  onTabChange,
  onDelete,
  onClose,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id ?? '');

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange],
  );

  const additionalButtons = useMemo(
    () =>
      isReadonly
        ? undefined
        : [
            {
              label: deleteLabel,
              // Design: red (Danger) / Solid / Standard with a leading trash icon.
              variant: ButtonVariant.Danger,
              appearance: ButtonAppearance.Solid,
              iconBefore: <IconTrash size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />,
              onClick: onDelete,
            },
          ],
    [isReadonly, deleteLabel, onDelete],
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

  const tabItems = useMemo(() => tabs.map(({ id, label }) => ({ id, label })), [tabs]);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return (
    <Popup
      open
      ariaLabel={name}
      header={
        <div className="relative">
          <EntityIdentity
            item={{ type: entityType, name, version, iconUrl }}
            labels={{ type: typeLabel }}
            hasFeaturedTag={false}
            iconSize={AVATAR_SIZE}
            headingLevel={2}
            nameClassName="dial-body-semi-text"
            typeClassName="dial-tiny-semi-text"
            footer={
              folder.length > 0 && (
                <span className="dial-tiny-text flex min-w-0 items-center gap-1 text-secondary">
                  <IconFolder
                    size={DIAL_ICON_SIZE.SM}
                    stroke={DIAL_KIT_ICON_STROKE}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  <span className="truncate">{folder.join(' / ')}</span>
                </span>
              )
            }
          />
          {avatarBadge && (
            // A box over the avatar, so the badge lands on its bottom-end corner.
            <span className="pointer-events-none absolute start-0 top-0 size-10 [&>*]:pointer-events-auto">
              {avatarBadge}
            </span>
          )}
        </div>
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
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 pb-4">{actions}</div>}
      {banner && <div className="dial-small-text shrink-0 pb-4 text-error">{banner}</div>}
      <Tabs
        tabs={tabItems}
        activeTabId={activeTab?.id ?? ''}
        onTabChange={handleTabChange}
        ariaLabel={name}
        className="shrink-0"
      />
      <div
        role="tabpanel"
        aria-label={activeTab?.label}
        className="min-h-0 flex-1 overflow-y-auto pt-4"
      >
        {activeTab?.panel}
      </div>
    </Popup>
  );
};
