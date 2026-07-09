'use client';
import { IconPlus } from '@tabler/icons-react';
import { FC, memo, useCallback, useMemo, useState } from 'react';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { AgentSkillsModalView } from '@/types/skill-validation';
import { Translation } from '@/types/translation';
import { buildPromptTree } from '@/utils/prompt-tree';
import { DialLinkButton, DialPopup, DialPrimaryButton, DialSearch } from '@epam/ai-dial-ui-kit';

import CreatePromptForm from './CreatePromptForm';
import PromptTreeSection from './PromptTreeSection';

export interface AgentSkillsModalProps {
  initialSelectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  editPromptId?: string;
}

const AgentSkillsModal: FC<AgentSkillsModalProps> = ({
  initialSelectedIds,
  onClose,
  onConfirm,
  editPromptId,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { prompts } = useDataContext();

  const [view, setView] = useState<AgentSkillsModalView>(
    editPromptId ? AgentSkillsModalView.Edit : AgentSkillsModalView.List,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(() => new Set());

  const orgPrompts = useMemo(
    () => prompts.filter((p) => p.id.startsWith('prompts/public/')),
    [prompts],
  );
  const personalPrompts = useMemo(
    () => prompts.filter((p) => !p.id.startsWith('prompts/public/')),
    [prompts],
  );

  const personalBucketRoot = useMemo(() => {
    const first = personalPrompts[0];
    if (!first) return '';
    const parts = first.id.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
  }, [personalPrompts]);

  const orgTree = useMemo(() => buildPromptTree(orgPrompts, 'prompts/public'), [orgPrompts]);
  const personalTree = useMemo(
    () => (personalBucketRoot ? buildPromptTree(personalPrompts, personalBucketRoot) : null),
    [personalPrompts, personalBucketRoot],
  );

  const searchLower = searchTerm.toLowerCase();

  const handleTogglePrompt = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleSelectIds = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      if (select) {
        const toAdd = ids.filter((id) => !prev.includes(id));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      }
      return prev.filter((id) => !ids.includes(id));
    });
  }, []);

  const handleToggleFolder = useCallback((folderId: string) => {
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedIds);
  }, [selectedIds, onConfirm]);

  const handleCreated = useCallback((newId: string) => {
    setSelectedIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
    setView(AgentSkillsModalView.List);
  }, []);

  const isEmpty = prompts.length === 0 && view === AgentSkillsModalView.List;
  const isFormView = view === AgentSkillsModalView.Create || view === AgentSkillsModalView.Edit;

  return (
    <DialPopup
      open
      header={
        view === AgentSkillsModalView.Create
          ? t(MarketplaceI18nKeys.CreatePrompt)
          : view === AgentSkillsModalView.Edit
            ? t(MarketplaceI18nKeys.EditPrompt)
            : t(MarketplaceI18nKeys.AddAgentSkills)
      }
      onClose={onClose}
      footer={
        view === AgentSkillsModalView.List ? (
          <div className="flex w-full justify-between px-6 py-4">
            <DialLinkButton
              iconBefore={<IconPlus size={18} />}
              label={t(MarketplaceI18nKeys.CreatePrompt)}
              onClick={() => setView(AgentSkillsModalView.Create)}
            />
            <DialPrimaryButton
              label={t(MarketplaceI18nKeys.SelectAgentSkills)}
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
            />
          </div>
        ) : null
      }
    >
      {isFormView ? (
        <CreatePromptForm
          onBack={
            view === AgentSkillsModalView.Edit ? onClose : () => setView(AgentSkillsModalView.List)
          }
          onCreated={handleCreated}
          editPromptId={view === AgentSkillsModalView.Edit ? editPromptId : undefined}
          onEdited={view === AgentSkillsModalView.Edit ? onClose : undefined}
        />
      ) : (
        <div className="flex flex-col">
          <div className="px-6 pb-2 pt-2">
            <DialSearch
              placeholder={t(MarketplaceI18nKeys.SearchAgentSkills)}
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            {isEmpty ? (
              <p className="dial-small-text py-10 text-center text-secondary">
                {t(MarketplaceI18nKeys.NoAgentSkillsAdded)}
              </p>
            ) : (
              <div className="flex flex-col">
                <PromptTreeSection
                  title={t(MarketplaceI18nKeys.OrganizationSection)}
                  root={orgTree}
                  searchLower={searchLower}
                  selectedIds={selectedIds}
                  openFolderIds={openFolderIds}
                  onTogglePrompt={handleTogglePrompt}
                  onToggleFolder={handleToggleFolder}
                  onSelectIds={handleSelectIds}
                />
                {personalTree && (
                  <PromptTreeSection
                    title={t(MarketplaceI18nKeys.MyPromptsSection)}
                    root={personalTree}
                    searchLower={searchLower}
                    selectedIds={selectedIds}
                    openFolderIds={openFolderIds}
                    onTogglePrompt={handleTogglePrompt}
                    onToggleFolder={handleToggleFolder}
                    onSelectIds={handleSelectIds}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DialPopup>
  );
};

export default memo(AgentSkillsModal);
