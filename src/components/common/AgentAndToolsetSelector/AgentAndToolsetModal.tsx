"use client";
import React, { useCallback, useMemo, useState } from "react";
import classNames from "classnames";
import { useDataContext } from "@/context/DataContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { MarketplaceI18nKeys } from "@/constants/i18n";
import {
  DialPrimaryButton,
  DialNeutralButton,
  DialTag,
} from "@epam/ai-dial-ui-kit";

interface AgentAndToolsetModalProps {
  initialSelectedIds: string[];
  allItemsMap: Record<
    string,
    { id: string; name?: string; type?: string } | undefined
  >;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  saveSliderStateInURL?: boolean;
}

export const AgentAndToolsetModal: React.FC<AgentAndToolsetModalProps> = ({
  initialSelectedIds,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { models, toolsets } = useDataContext();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelectedIds),
  );
  const [search, setSearch] = useState("");

  const allItems = useMemo(
    () => [...models.filter((m) => m.type === "application"), ...toolsets],
    [models, toolsets],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }, [allItems, search]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const existing = initialSelectedIds.filter((id) => selectedIds.has(id));
    const added = [...selectedIds].filter(
      (id) => !initialSelectedIds.includes(id),
    );
    onConfirm([...existing, ...added]);
  }, [initialSelectedIds, onConfirm, selectedIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blackout">
      <div className="flex h-[80vh] w-[600px] max-w-[90vw] flex-col rounded-lg bg-layer-1 shadow-xl">
        <div className="flex items-center justify-be/tween border-b border-tertiary px-6 py-1">
          <h2 className="text-base font-semibold">
            {t(MarketplaceI18nKeys.AgentsAndToolsets)}
          </h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary"
          >
            ✕
          </button>
        </div>
        <div className="border-b border-tertiary px-6 py-3">
          <input
            type="text"
            className="w-full rounded border border-tertiary bg-layer-2 px-3 py-2 text-sm outline-none"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-1 border-b border-tertiary px-6 py-3">
            {[...selectedIds].map((id) => {
              const item = allItems.find((i) => i.id === id);
              return (
                <DialTag
                  key={id}
                  label={item?.name ?? id}
                  closable
                  onRemove={() => toggle(id)}
                />
              );
            })}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={classNames(
                "mb-1 flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-layer-3",
                selectedIds.has(item.id) && "bg-layer-3",
              )}
              onClick={() => toggle(item.id)}
            >
              <div
                className={classNames(
                  "h-4 w-4 shrink-0 rounded border border-primary",
                  selectedIds.has(item.id) &&
                    "border-accent-primary bg-accent-primary",
                )}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-secondary">{item.type}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-tertiary px-6 py-1">
          <DialNeutralButton label="Cancel" onClick={onClose} />
          <DialPrimaryButton label="Apply" onClick={handleConfirm} />
        </div>
      </div>
    </div>
  );
};
