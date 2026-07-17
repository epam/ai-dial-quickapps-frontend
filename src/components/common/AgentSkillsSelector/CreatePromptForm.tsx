import { IconAlertCircleFilled, IconCircleCheckFilled, IconHelpCircle } from '@tabler/icons-react';
import { FC, memo, useCallback, useEffect, useState } from 'react';

import HoverableTooltip from '@/components/common/HoverableTooltip/HoverableTooltip';
import { CommonI18nKeys, MarketplaceI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useSkillValidation } from '@/hooks/useSkillValidation';
import { useTranslation } from '@/hooks/useTranslation';
import { SkillValidationStatus } from '@/types/skill-validation';
import { Translation } from '@/types/translation';
import { promptPathUrl } from '@/utils/prompt-tree';
import {
  DialFormItem,
  DialInput,
  DialNeutralButton,
  DialPrimaryButton,
  DialTextarea,
  DialTooltip,
} from '@epam/ai-dial-ui-kit';

export interface CreatePromptFormProps {
  onBack: () => void;
  onCreated: (newPromptId: string) => void;
  editPromptId?: string;
}

const CreatePromptForm: FC<CreatePromptFormProps> = ({ onBack, onCreated, editPromptId }) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { refreshPrompts, promptsVersion } = useDataContext();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedPromptId, setValidatedPromptId] = useState<string | null>(editPromptId ?? null);
  const skillValidation = useSkillValidation(validatedPromptId ?? '', promptsVersion);
  const { app } = useAppContext();
  const canValidateSkill = !!app?.id && !!validatedPromptId;

  useEffect(() => {
    if (!editPromptId) return;
    let cancelled = false;
    const load = () => {
      setIsSaving(true);
      return fetch(promptPathUrl(editPromptId));
    };

    load()
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(text) as {
            name?: string;
            description?: string;
            content?: string;
          };
          setName(data.name ?? '');
          setDescription(data.description ?? '');
          setContent(data.content ?? '');
        } catch {
          // Raw text prompt (e.g. markdown skill)
          setContent(text);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load prompt.');
      })
      .finally(() => {
        if (!cancelled) setIsSaving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editPromptId]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (!trimmedName || !trimmedContent) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editPromptId) {
        const res = await fetch(promptPathUrl(editPromptId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editPromptId,
            folderId: editPromptId.slice(0, editPromptId.lastIndexOf('/')),
            name: trimmedName,
            description: description.trim(),
            content: trimmedContent,
          }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        await refreshPrompts();
        setValidatedPromptId(editPromptId);
        onBack();
      } else {
        const bucketRes = await fetch('/api/dial/v1/bucket');
        if (!bucketRes.ok) throw new Error('Failed to fetch bucket');
        const { bucket } = (await bucketRes.json()) as { bucket: string };

        const newId = `prompts/${bucket}/${trimmedName}`;
        const fileName = encodeURIComponent(trimmedName);
        const res = await fetch(`/api/dial/v1/prompts/${bucket}/${fileName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newId,
            folderId: `prompts/${bucket}`,
            name: trimmedName,
            description: description.trim(),
            content: trimmedContent,
          }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        await refreshPrompts();
        setValidatedPromptId(newId);
        onCreated(newId);
        onBack();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  }, [name, description, content, editPromptId, refreshPrompts, onCreated, onBack]);

  const isSaveDisabled = !name.trim() || !content.trim() || isSaving;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
      <DialFormItem label={t(MarketplaceI18nKeys.PromptName)} required>
        <DialInput
          value={name}
          onChange={(val) => setName(val ?? '')}
          placeholder={t(MarketplaceI18nKeys.EnterPromptName)}
          containerClassName="w-full"
          autoFocus
        />
      </DialFormItem>

      <DialFormItem label={t(MarketplaceI18nKeys.PromptDescription)}>
        <DialTextarea
          value={description}
          onChange={(val) => setDescription(val)}
          placeholder={t(MarketplaceI18nKeys.EnterPromptDescription)}
          rows={3}
          containerClassName="w-full"
        />
      </DialFormItem>

      <DialFormItem
        label={
          <div className="flex items-center w-full justify-between">
            <span>
              {t(MarketplaceI18nKeys.PromptContentLabel)}
              <span className="ms-1 text-accent-primary">*</span>
            </span>
            <span className="flex items-center">
              {!canValidateSkill && (
                <DialTooltip tooltip={t(MarketplaceI18nKeys.AgentSkillValidationPendingHint)}>
                  <span className="me-2 flex cursor-help items-center gap-1.5 text-secondary">
                    <IconCircleCheckFilled size={16} className="opacity-50" />
                    <span className="dial-tiny-text">
                      {t(MarketplaceI18nKeys.AgentSkillValidationPending)}
                    </span>
                  </span>
                </DialTooltip>
              )}
              {canValidateSkill && skillValidation.status === SkillValidationStatus.Validating && (
                <span className="me-2 flex items-center gap-1.5 text-secondary">
                  <span className="dial-tiny-text">
                    {t(MarketplaceI18nKeys.AgentSkillValidationPending)}
                  </span>
                </span>
              )}
              {canValidateSkill && skillValidation.status === SkillValidationStatus.Valid && (
                <span className="me-2 flex items-center gap-1.5 text-accent-secondary">
                  <IconCircleCheckFilled size={16} />
                  <span className="dial-tiny-text">{t(MarketplaceI18nKeys.ValidAgentSkill)}</span>
                </span>
              )}
              {canValidateSkill && skillValidation.status === SkillValidationStatus.Invalid && (
                <DialTooltip
                  tooltip={
                    skillValidation.message || t(MarketplaceI18nKeys.AgentSkillsInvalidError)
                  }
                >
                  <span className="me-2 flex cursor-help items-center gap-1.5 text-error">
                    <IconAlertCircleFilled size={16} />
                    <span className="dial-tiny-text">
                      {t(MarketplaceI18nKeys.AgentSkillsInvalidError)}
                    </span>
                  </span>
                </DialTooltip>
              )}
              <HoverableTooltip
                tooltip={
                  <span>
                    <a
                      href="https://agentskills.io/home"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                    >
                      {t(MarketplaceI18nKeys.AgentSkills)}
                    </a>{' '}
                    {t(MarketplaceI18nKeys.AgentSkillHintBody)}{' '}
                    {t(MarketplaceI18nKeys.AgentSkillHintSeeExamples)}{' '}
                    <a
                      href="https://agentskills.io/specification#skill-md-format"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                    >
                      {t(MarketplaceI18nKeys.AgentSkillHintHere)}
                    </a>
                    .
                  </span>
                }
              >
                <IconHelpCircle size={16} className="cursor-help text-secondary" />
              </HoverableTooltip>
            </span>
          </div>
        }
      >
        <DialTextarea
          value={content}
          onChange={(val) => setContent(val)}
          onBlur={(e) => setContent((e.target as HTMLTextAreaElement).value.trim())}
          placeholder={t(MarketplaceI18nKeys.EnterPromptContent)}
          rows={10}
          containerClassName="w-full"
        />
      </DialFormItem>

      {error && <p className="dial-small-text text-error">{error}</p>}

      <div className="flex justify-end gap-2">
        <DialNeutralButton
          label={tCommon(editPromptId ? CommonI18nKeys.Cancel : CommonI18nKeys.Back)}
          onClick={onBack}
          disabled={isSaving}
        />
        <DialPrimaryButton
          label={t(MarketplaceI18nKeys.CreatePromptAction)}
          onClick={handleSave}
          disabled={isSaveDisabled}
        />
      </div>
    </div>
  );
};

export default memo(CreatePromptForm);
