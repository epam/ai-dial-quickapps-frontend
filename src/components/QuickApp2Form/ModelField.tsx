'use client';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { FC, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { MarketplaceI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { DialModel } from '@/types/dial-entities';
import classNames from 'classnames';

interface ModelFieldProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  tooltip?: string;
  error?: string;
}

export const ModelField: FC<ModelFieldProps> = ({
  value,
  onChange,
  disabled,
  tooltip,
  error,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { models } = useDataContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const availableModels = models.filter(
    (m) => m.type === 'model' || m.type === 'application',
  );

  const filtered = search
    ? availableModels.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.id.toLowerCase().includes(search.toLowerCase()),
      )
    : availableModels;

  const selectedModel = availableModels.find((m) => m.id === value);
  const displayName = selectedModel?.name ?? value ?? t(MarketplaceI18nKeys.SelectModel);

  const handleSelect = (m: DialModel) => {
    onChange(m.id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative" title={tooltip}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={classNames(
          'flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm',
          error ? 'border-error' : 'border-primary',
          disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-accent',
        )}
      >
        <span className="truncate">{displayName}</span>
        <IconChevronDown size={16} className="ml-2 shrink-0 text-secondary" />
      </button>

      {error && <p className="mt-1 text-xs text-error">{error}</p>}

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded border border-primary bg-layer-2 shadow-lg">
          <div className="flex items-center gap-2 border-b border-primary px-3 py-2">
            <IconSearch size={16} className="shrink-0 text-secondary" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(MarketplaceI18nKeys.SelectModel)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-secondary"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-secondary">
                {t(MarketplaceI18nKeys.SelectModel)}
              </li>
            ) : (
              filtered.map((m) => (
                <li
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className={classNames(
                    'cursor-pointer px-3 py-2 text-sm hover:bg-layer-3',
                    m.id === value && 'bg-layer-3 font-medium',
                  )}
                >
                  <div className="truncate">{m.name}</div>
                  {m.version && (
                    <div className="text-xs text-secondary">
                      {t(MarketplaceI18nKeys.VersionPrefixMarketplace)}{m.version}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
