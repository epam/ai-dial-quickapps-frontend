'use client';
import classNames from 'classnames';
import { FC, useCallback, useMemo, useState } from 'react';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DialModel } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import {
  DialLinkButton,
  DialLoader,
  DialNoDataContent,
  DialPopup,
  DialSearch,
  DialSelect,
  DialTabs,
  PopupSize,
  SelectSize,
} from '@epam/ai-dial-ui-kit';

import { ModelIcon } from '@/components/common/ModelIcon/ModelIcon';
import { TopicsLine } from '@/components/common/TopicsLine/TopicsLine';
import { IconAlertCircleFilled, IconBulb, IconStarFilled } from '@tabler/icons-react';

interface ModelGroup {
  name: string;
  type: string;
  models: DialModel[];
  description?: string;
  topics: string[];
  iconUrl?: string;
}

function groupModelsByName(models: DialModel[]): ModelGroup[] {
  const map = new Map<string, DialModel[]>();
  for (const m of models) {
    const bucket = map.get(m.name) ?? [];
    bucket.push(m);
    map.set(m.name, bucket);
  }
  return Array.from(map.entries()).map(([name, models]) => ({
    name,
    type: models[0].type,
    models,
    description: (models[0] as { description?: string }).description,
    topics: models[0].topics ?? [],
    iconUrl: models[0].iconUrl,
  }));
}

const VERSION_SELECT_CLASS =
  '!w-fit !border-none !bg-transparent !shadow-none !outline-none !ring-0 !p-0';

interface ModelCardProps {
  group: ModelGroup;
  isSelected: boolean;
  isFavorite: boolean;
  currentModelId: string;
  versionPrefix: string;
  onSelect: (id: string) => void;
}

const ModelCard: FC<ModelCardProps> = ({
  group,
  isSelected,
  isFavorite,
  currentModelId,
  versionPrefix,
  onSelect,
}) => {
  const representativeId =
    group.models.find((m) => m.id === currentModelId)?.id ?? group.models[0].id;
  const representative = group.models.find((m) => m.id === representativeId)!;
  const hasVersions = group.models.length > 1;
  const versionOptions = hasVersions
    ? group.models.map((m) => ({ value: m.id, label: m.version ?? m.id }))
    : [];

  return (
    <article
      className={classNames(
        'relative box-border flex cursor-pointer flex-col gap-[14px] rounded-[16px] border p-[11px] md:p-[15px] xl:p-[19px]',
        'bg-layer-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        'transition-shadow duration-[180ms] ease-out',
        'hover:shadow-[0_6px_16px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
        isSelected ? 'border-accent-primary' : 'border-[rgba(0,0,0,0.07)]',
      )}
      onClick={() => onSelect(representativeId)}
    >
      {isFavorite && (
        <IconStarFilled
          size={16}
          className="absolute end-3 top-3 text-warning-icon"
          aria-hidden="true"
        />
      )}

      {/* AppIdentity block */}
      <div className="flex min-w-0 items-start gap-3">
        <ModelIcon name={group.name} iconUrl={group.iconUrl} size={44} radius={12} />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="dial-caption-text mb-2 font-semibold uppercase tracking-[0.06em] text-accent-primary">
            {group.type}
          </span>
          <span className="dial-body-semi-text min-w-0 truncate text-primary">{group.name}</span>

          {/* Version row — always occupies space */}
          <div className="dial-tiny-text flex min-h-[20px] items-center overflow-hidden gap-1">
            {(hasVersions || representative.version) && (
              <span className="shrink-0 text-secondary">{versionPrefix}</span>
            )}
            {hasVersions ? (
              <div className="max-w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <DialSelect
                  size={SelectSize.Sm}
                  options={versionOptions}
                  value={representativeId}
                  customSelectedValue={representative.version ?? representativeId}
                  className={VERSION_SELECT_CLASS}
                  listClassName="!w-fit"
                  onChange={(v) => onSelect(v as string)}
                />
              </div>
            ) : representative.version ? (
              <span className="truncate text-primary">{representative.version}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Description */}
      {group.description && (
        <p className="dial-small-text line-clamp-2 min-h-0 shrink-0 leading-[1.4] text-secondary">
          {group.description}
        </p>
      )}

      {/* Topics — min-h keeps space reserved when empty */}
      <div className="min-h-[22px]">
        <TopicsLine topics={group.topics} />
      </div>
    </article>
  );
};

const TAB_IDS = { favorites: 'favorites', catalog: 'catalog' } as const;
type ModelFieldTab = (typeof TAB_IDS)[keyof typeof TAB_IDS];

interface ModelFieldProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  tooltip?: string;
  error?: string;
}

export const ModelField: FC<ModelFieldProps> = ({ value, onChange, disabled, tooltip, error }) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { models, favoriteIds, status, error: dataError, refreshAll } = useDataContext();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ModelFieldTab>(TAB_IDS.catalog);

  const tabs = useMemo(
    () => [
      { id: TAB_IDS.favorites, label: t(MarketplaceI18nKeys.MyFavorites) },
      { id: TAB_IDS.catalog, label: t(MarketplaceI18nKeys.CatalogTab) },
    ],
    [t],
  );

  const availableModels = useMemo(
    () => models.filter((m) => m.type === 'model' || m.type === 'application'),
    [models],
  );

  const allGroups = useMemo(() => groupModelsByName(availableModels), [availableModels]);

  const selectedModel = availableModels.find((m) => m.id === value);
  const displayName = selectedModel?.name ?? value ?? t(MarketplaceI18nKeys.SelectModel);

  const selectedGroup = allGroups.find((g) => g.models.some((m) => m.id === value));
  const hasVersions = (selectedGroup?.models.length ?? 0) > 1;
  const cardVersionOptions = hasVersions
    ? (selectedGroup?.models ?? []).map((m) => ({
        value: m.id,
        label: m.version ?? m.id,
      }))
    : [];

  const favoriteGroups = useMemo(
    () => allGroups.filter((g) => g.models.some((m) => favoriteIds.has(m.id))),
    [allGroups, favoriteIds],
  );

  const filteredGroups = useMemo(() => {
    const base = activeTab === TAB_IDS.favorites ? favoriteGroups : allGroups;
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter((g) => g.name.toLowerCase().includes(q));
  }, [allGroups, favoriteGroups, search, activeTab]);

  const handleSelect = useCallback(
    (modelId: string) => {
      onChange(modelId);
      setIsOpen(false);
      setSearch('');
    },
    [onChange],
  );

  const handleOpen = useCallback(() => {
    if (!disabled) setIsOpen(true);
  }, [disabled]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as ModelFieldTab);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setActiveTab(TAB_IDS.catalog);
  }, []);

  return (
    <div title={tooltip}>
      {/* Collapsed card */}
      <div
        className={classNames(
          'flex items-center gap-3 rounded border bg-layer-3 px-4 py-3',
          error ? 'border-error' : 'border-tertiary',
          disabled && 'opacity-50',
        )}
      >
        <ModelIcon name={displayName} iconUrl={selectedModel?.iconUrl} size={32} radius={8} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={classNames(
              'dial-small-semi-text truncate',
              selectedModel ? 'text-primary' : 'text-secondary',
            )}
          >
            {displayName}
          </span>

          {(hasVersions || selectedModel?.version) && (
            <div className="dial-tiny-text flex items-center gap-1">
              <span className="shrink-0 text-secondary">
                {t(MarketplaceI18nKeys.VersionPrefixMarketplace)}
              </span>
              {hasVersions ? (
                <div className="w-fit" onClick={(e) => e.stopPropagation()}>
                  <DialSelect
                    size={SelectSize.Sm}
                    options={cardVersionOptions}
                    value={value}
                    customSelectedValue={selectedModel?.version ?? value}
                    disabled={disabled}
                    className={VERSION_SELECT_CLASS}
                    listClassName="!w-fit"
                    onChange={(v) => onChange(v as string)}
                  />
                </div>
              ) : (
                <span className="text-secondary">{selectedModel?.version}</span>
              )}
            </div>
          )}
        </div>

        <DialLinkButton
          className="shrink-0"
          label={t(MarketplaceI18nKeys.Change)}
          onClick={handleOpen}
          disabled={disabled}
        />
      </div>

      {error && <p className="dial-tiny-text mt-1 text-error">{error}</p>}

      <DialPopup
        open={isOpen}
        header={t(MarketplaceI18nKeys.SelectModel)}
        size={PopupSize.Lg}
        onClose={handleClose}
      >
        {/* Sticky header: search + tabs */}
        <div className="flex justify-between gap-3 border-b border-tertiary px-6 pb-3 pt-4  bg-layer-2">
          <div className="flex-1 bg-layer-0">
            <DialSearch
              value={search}
              placeholder={t(MarketplaceI18nKeys.SearchPlaceholder)}
              onChange={setSearch}
            />
          </div>
          <DialTabs tabs={tabs} activeTab={activeTab} onClick={handleTabChange} />
        </div>

        {/* Scrollable grid: 1 column on small screens, 3×3 on large */}
        <div className="max-h-[70vh] overflow-y-auto bg-layer-2 px-6 py-4">
          {status === 'loading' || status === 'idle' ? (
            <div className="flex items-center justify-center py-16">
              <DialLoader size={32} fullWidth={false} ariaLabel={t(MarketplaceI18nKeys.LoadingModels)} />
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <DialNoDataContent
                title={t(MarketplaceI18nKeys.FailedToLoadModels)}
                description={dataError}
                icon={<IconAlertCircleFilled size={48} stroke={0.5} className="text-error" />}
              />
              <DialLinkButton label={t(MarketplaceI18nKeys.Retry)} onClick={refreshAll} />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <DialNoDataContent
                title={t(
                  activeTab === TAB_IDS.favorites
                    ? MarketplaceI18nKeys.NoFavoritesYet
                    : MarketplaceI18nKeys.NA,
                )}
                icon={<IconBulb size={48} stroke={0.5} />}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <ModelCard
                  key={group.name}
                  group={group}
                  isSelected={group.models.some((m) => m.id === value)}
                  isFavorite={group.models.some((m) => favoriteIds.has(m.id))}
                  currentModelId={value}
                  versionPrefix={t(MarketplaceI18nKeys.VersionPrefixMarketplace)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </DialPopup>
    </div>
  );
};
