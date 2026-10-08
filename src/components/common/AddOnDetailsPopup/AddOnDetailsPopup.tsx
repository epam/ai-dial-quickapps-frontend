import {
  AboutTab,
  type CatalogItem,
  ContentTab,
  LimitsTab,
  OverviewTab,
  PricingTab,
  ToolsTab,
} from '@epam/ai-dial-catalog';
import { CatalogDetailsTab, getCatalogDetailsTabs } from '@epam/ai-dial-catalog/mapping';
import {
  ButtonAppearance,
  ButtonVariant,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  EntityIdentity,
  EntityType,
  NeutralButton,
  NoDataContent,
  Popup,
  PopupSize,
  Spinner,
  Tabs,
} from '@epam/ai-dial-ui-kit';
import { IconFolder, IconTrash } from '@tabler/icons-react';
import { FC, ReactNode, useCallback, useMemo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useCatalogDetailsLabels } from '@/hooks/use-catalog-details-labels';
import { useTranslation } from '@/hooks/use-translation';
import { type AddOnDetailsTab, DetailsStatus } from '@/types/entity-details';
import { Translation } from '@/types/translation';

const AVATAR_SIZE = 40;
const LOADING_SPINNER_SIZE = 16;

// The typography the catalog's DetailsPanel renders its Overview with.
const OVERVIEW_CLASSES = {
  sectionClassName: 'dial-caption-text',
  labelClassName: 'dial-small-semi-text',
  valueClassName: 'dial-small-text',
  valueTrueClassName: 'dial-small-text',
};

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
  /**
   * The entity as a catalog item, with `details` once loaded. It decides the
   * tabs exactly as the chat catalog does. Undefined when the entity is no
   * longer listed.
   */
  item?: CatalogItem;
  detailsStatus: DetailsStatus;
  onRetry: () => void;
  /** Replaces the tabs, for an entity that is no longer listed. */
  unavailableText?: string;
  /** Hides Delete; only Close is offered. */
  isReadonly: boolean;
  deleteLabel: string;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * The shell shared by the skill, toolset and agent details popups: identity
 * header with the folder line, an optional action row and banner, the
 * catalog's details tabs, and the Delete (detach from the app) / Close
 * footer. Tabs and their content are the chat catalog's own components, so
 * each entity reads exactly as it does in the catalog.
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
  item,
  detailsStatus,
  onRetry,
  unavailableText,
  isReadonly,
  deleteLabel,
  onDelete,
  onClose,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { tabs: labels } = useCatalogDetailsLabels();
  const [selectedTabId, setSelectedTabId] = useState<AddOnDetailsTab>();

  const tabIds = useMemo(
    () =>
      item == null
        ? []
        : (getCatalogDetailsTabs(item, { isConnectHidden: true }) as AddOnDetailsTab[]),
    [item],
  );
  // Tabs appear as details load; until the chosen one exists, the first shows.
  const activeTabId =
    selectedTabId != null && tabIds.includes(selectedTabId) ? selectedTabId : tabIds[0];

  const handleTabChange = useCallback(
    (tabId: string) => setSelectedTabId(tabId as AddOnDetailsTab),
    [],
  );

  const tabItems = useMemo(
    () => tabIds.map((id) => ({ id, label: labels.tabs[id] })),
    [tabIds, labels],
  );

  const additionalButtons = useMemo(
    () =>
      isReadonly
        ? undefined
        : [
            {
              label: deleteLabel,
              // Design: red (Danger) / Outlined with a leading trash icon.
              variant: ButtonVariant.Danger,
              appearance: ButtonAppearance.Outlined,
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

  const renderPanel = (tabId: AddOnDetailsTab, current: CatalogItem): ReactNode => {
    const details = current.details;
    switch (tabId) {
      case CatalogDetailsTab.About:
        return <AboutTab content={current.description} topics={current.topics} />;
      case CatalogDetailsTab.Content:
        return (
          <ContentTab
            content={details?.promptContent?.content ?? ''}
            description={details?.promptContent?.description ?? current.description}
          />
        );
      case CatalogDetailsTab.Overview:
        return (
          // Full-bleed, as in the catalog: section dividers span the popup body.
          <div className="-mx-6">
            <OverviewTab
              sections={details?.overview?.sections}
              {...OVERVIEW_CLASSES}
              yesLabel={labels.yes}
              noLabel={labels.no}
            />
          </div>
        );
      case CatalogDetailsTab.Pricing:
        return (
          <PricingTab
            pricing={details?.pricing}
            pricesSectionLabel={labels.pricesSection}
            characterPricesSectionLabel={labels.characterPricesSection}
            limitsSectionLabel={labels.usageLimitsSection}
          />
        );
      case CatalogDetailsTab.Limits:
        return <LimitsTab limits={details?.limits} />;
      case CatalogDetailsTab.Tools:
        return <ToolsTab tools={details?.tools} labels={labels.tools} />;
      default:
        return null;
    }
  };

  const renderBody = () => {
    if (unavailableText != null || item == null) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <NoDataContent title={unavailableText} />
        </div>
      );
    }

    return (
      <>
        <div className="flex shrink-0 items-center gap-2">
          <Tabs
            tabs={tabItems}
            activeTabId={activeTabId ?? ''}
            onTabChange={handleTabChange}
            ariaLabel={name}
            className="min-w-0 flex-1"
          />
          {detailsStatus === DetailsStatus.Loading && (
            <span role="status" className="shrink-0">
              <Spinner size={LOADING_SPINNER_SIZE} fullWidth={false} ariaLabel={labels.loading} />
            </span>
          )}
        </div>
        {detailsStatus === DetailsStatus.Error && (
          <div role="alert" className="flex shrink-0 items-center gap-3 pt-4">
            <p className="dial-small-text text-error">{labels.failed}</p>
            <NeutralButton label={labels.retry} onClick={onRetry} />
          </div>
        )}
        <div
          role="tabpanel"
          aria-label={activeTabId == null ? undefined : labels.tabs[activeTabId]}
          className="min-h-0 flex-1 overflow-y-auto pt-4"
        >
          {activeTabId != null && renderPanel(activeTabId, item)}
        </div>
      </>
    );
  };

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
      {renderBody()}
    </Popup>
  );
};
