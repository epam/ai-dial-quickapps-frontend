import {
  AboutTab,
  ApiTab,
  type CatalogItem,
  DetailsHeader,
  ContentTab,
  LimitsTab,
  OverviewTab,
  PricingTab,
  ToolsTab,
} from '@epam/ai-dial-catalog';
import { CatalogDetailsTab, getCatalogDetailsTabs } from '@epam/ai-dial-catalog/mapping';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import {
  ButtonAppearance,
  ButtonVariant,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  NeutralButton,
  NoDataContent,
  Popup,
  PopupSize,
  Skeleton,
  Tabs,
} from '@epam/ai-dial-ui-kit';
import { IconTrash } from '@tabler/icons-react';
import { FC, ReactNode, useCallback, useMemo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useCatalogDetailsLabels } from '@/hooks/use-catalog-details-labels';
import { useContentFileSelection } from '@/hooks/use-content-file-selection';
import { useTranslation } from '@/hooks/use-translation';
import { type AddOnDetailsTab, DetailsStatus } from '@/types/entity-details';
import { Translation } from '@/types/translation';

const LOADING_SKELETON_PARAGRAPH = { rows: 1, width: '72px' };

const loadNoContentFile = async (): Promise<string | undefined> => undefined;

// The catalog header shows Share, Publish and Download unless the host rules them out.
const hideHeaderAction = (): boolean => false;

// The typography the catalog's DetailsPanel renders its Overview with.
const OVERVIEW_CLASSES = {
  sectionClassName: 'dial-caption-text',
  labelClassName: 'dial-small-semi-text',
  valueClassName: 'dial-small-text',
  valueTrueClassName: 'dial-small-text',
};

/** Sign-in handlers for the catalog header's credentials action (toolsets only). */
export interface AddOnDetailsCredentials {
  onLogin: (params: { apiKey?: string }) => Promise<void>;
  onLogout: () => Promise<void>;
}

export interface AddOnDetailsPopupProps {
  /** The catalog type, which also picks the header's translated caption. */
  entityType: CatalogEntityType;
  name: string;
  version?: string;
  iconUrl?: string;
  /** Folder path segments (scope label first); the line is hidden when empty. */
  folder: string[];
  /** Enables the header's credentials action; omitted in a read-only app or without auth. */
  credentials?: AddOnDetailsCredentials;
  /** This app's own buttons under the header, e.g. an agent's Connection. */
  actions?: ReactNode;
  /**
   * The entity as a catalog item, with `details` once loaded. It decides the
   * tabs exactly as the chat catalog does. Undefined when the entity is no
   * longer listed.
   */
  item?: CatalogItem;
  detailsStatus: DetailsStatus;
  onRetry: () => void;
  /** Loads another file of a skill's package for the Details tab file selector. */
  onLoadContentFile?: (fileId: string) => Promise<string | undefined>;
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
 * header with the folder line, an optional action row, the
 * catalog's details tabs, and the Delete (detach from the app) / Close
 * footer. Tabs and their content are the chat catalog's own components, so
 * each entity reads exactly as it does in the catalog.
 */
export const AddOnDetailsPopup: FC<AddOnDetailsPopupProps> = ({
  entityType,
  name,
  version,
  iconUrl,
  folder,
  credentials,
  actions,
  item,
  detailsStatus,
  onRetry,
  onLoadContentFile = loadNoContentFile,
  unavailableText,
  isReadonly,
  deleteLabel,
  onDelete,
  onClose,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const {
    settings: { dialCoreExternalUrl },
  } = useAppContext();
  const { tabs: labels } = useCatalogDetailsLabels();
  const [selectedTabId, setSelectedTabId] = useState<AddOnDetailsTab>();

  // The catalog header shows its owner actions (Share, Edit, Delete in the
  // Manage menu) from `isMyApp` / `isEditable` alone, so the header gets an
  // item without them: here an add-on is only detached, from the footer.
  const headerItem = useMemo(
    (): CatalogItem => ({
      ...(item ?? {
        id: name,
        name,
        type: entityType,
        version: version ?? '',
        iconUrl,
        description: '',
        topics: [],
        folder,
        lastUsed: '',
      }),
      isMyApp: false,
      isEditable: false,
    }),
    [item, name, entityType, version, iconUrl, folder],
  );
  const contentFiles = useContentFileSelection(item, onLoadContentFile, labels.contentFiles.error);

  const tabIds = useMemo(
    () =>
      item == null
        ? []
        : // Without the DIAL Core URL the catalog would build relative endpoints.
          getCatalogDetailsTabs(item, { isConnectHidden: !dialCoreExternalUrl }),
    [item, dialCoreExternalUrl],
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
        return (
          <AboutTab
            content={current.description}
            topics={current.topics}
            markdownLabels={labels.markdown}
          />
        );
      case CatalogDetailsTab.Content:
        return (
          <ContentTab
            content={details?.promptContent?.content ?? ''}
            description={details?.promptContent?.description ?? current.description}
            files={details?.promptContent?.files}
            selectedFileId={contentFiles.selectedFileId}
            onSelectFile={contentFiles.onSelectFile}
            filePreview={contentFiles.filePreview}
            isFileLoading={contentFiles.isFileLoading}
            expandedFolderIds={contentFiles.expandedFolderIds}
            onToggleFolder={contentFiles.onToggleFolder}
            isFileSelectorOpen={contentFiles.isFileSelectorOpen}
            onFileSelectorOpenChange={contentFiles.onFileSelectorOpenChange}
            fileSelectorAriaLabel={labels.contentFiles.selector}
            fileCountLabel={labels.contentFiles.count}
            fileLoadingLabel={labels.contentFiles.loading}
            fileUnsupportedLabel={labels.contentFiles.unsupported}
            markdownLabels={labels.markdown}
          />
        );
      case CatalogDetailsTab.Overview:
        return (
          <OverviewTab
            sectionContainerClassName="p-0 pe-4"
            sections={details?.overview?.sections}
            {...OVERVIEW_CLASSES}
            yesLabel={labels.yes}
            noLabel={labels.no}
          />
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
      case CatalogDetailsTab.Api:
        return details?.api == null ? null : <ApiTab api={details.api} {...labels.connect} />;
      default:
        return null;
    }
  };

  const renderBody = () => {
    if (unavailableText != null || item == null) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NoDataContent title={unavailableText} />
        </div>
      );
    }

    return (
      <>
        {/* The catalog's tab row: the loading skeleton sits after the tabs. */}
        <div className="flex shrink-0 items-center">
          <Tabs
            tabs={tabItems}
            activeTabId={activeTabId ?? ''}
            onTabChange={handleTabChange}
            ariaLabel={name}
          />
          {detailsStatus === DetailsStatus.Loading && (
            <div role="status" aria-label={labels.loading} className="shrink-0">
              <Skeleton showTitle={false} paragraph={LOADING_SKELETON_PARAGRAPH} active />
            </div>
          )}
        </div>
        {detailsStatus === DetailsStatus.Error && (
          <div role="alert" className="flex shrink-0 items-center gap-3">
            <p className="dial-small-text text-error">{labels.failed}</p>
            <NeutralButton label={labels.retry} onClick={onRetry} />
          </div>
        )}
        <div
          role="tabpanel"
          aria-label={activeTabId == null ? undefined : labels.tabs[activeTabId]}
          className="min-h-0 flex-1 overflow-y-auto"
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
      overlayStyle={{ overflow: 'hidden' }}
      // The catalog's own details header. It brings its own `px-6 py-4`, so
      // the popup header drops its padding but keeps the close control's.
      header={
        <DetailsHeader
          item={headerItem}
          texts={labels.header}
          isShareVisible={hideHeaderAction}
          isPublishVisible={hideHeaderAction}
          isDownloadVisible={hideHeaderAction}
          onLogin={credentials && ((_, { apiKey }) => credentials.onLogin({ apiKey }))}
          onLogout={credentials && (() => credentials.onLogout())}
          // The catalog starts an OAuth Log out only through this; it runs directly here.
          onRequestLogout={credentials && (() => void credentials.onLogout())}
        />
      }
      headerClassName="items-start p-0 pe-6 pt-4"
      titleClassName="me-0 overflow-visible whitespace-normal"
      size={PopupSize.Lg}
      closeAriaLabel={tCommon(CommonI18nKeys.CloseDialog)}
      bodyClassName="flex h-[70vh] flex-col gap-4 overflow-hidden px-6 pb-5"
      additionalButtons={additionalButtons}
      additionalButtonsOnLeft
      mainButtons={mainButtons}
      footerDivider
      onClose={onClose}
    >
      {/* Under the name, as in the catalog header: indented by the icon and its gap. */}
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 ps-[60px]">{actions}</div>
      )}
      {renderBody()}
    </Popup>
  );
};
