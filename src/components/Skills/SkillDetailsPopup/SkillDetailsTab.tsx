import { ContentTab } from '@epam/ai-dial-catalog';
import { NeutralButton, NoDataContent, Spinner } from '@epam/ai-dial-ui-kit';
import { FC } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useSkillManifest } from '@/hooks/use-skill-manifest';
import { useTranslation } from '@/hooks/useTranslation';
import type { DialSkill } from '@/types/dial-entities';
import { ManifestStatus } from '@/types/skill-manifest';
import { Translation } from '@/types/translation';

export interface SkillDetailsTabProps {
  /** Undefined when the attached skill is no longer in the catalog. */
  skill?: DialSkill;
}

/** The Details tab: the skill's description and its rendered `SKILL.md` body. */
export const SkillDetailsTab: FC<SkillDetailsTabProps> = ({ skill }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { status, manifest, retry } = useSkillManifest(skill);

  if (skill == null) {
    return <NoDataContent title={t(QuickAppEditorI18nKeys.SkillUnavailable)} />;
  }

  if (status === ManifestStatus.Ready && manifest != null) {
    return (
      <ContentTab content={manifest.body} description={manifest.description ?? skill.description} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {skill.description && <p className="dial-small-text text-secondary">{skill.description}</p>}
      {status === ManifestStatus.Error ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="dial-small-text text-error">
            {t(QuickAppEditorI18nKeys.FailedToLoadSkillContent)}
          </p>
          <NeutralButton label={t(QuickAppEditorI18nKeys.Retry)} onClick={retry} />
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <Spinner
            size={32}
            fullWidth={false}
            ariaLabel={t(QuickAppEditorI18nKeys.LoadingSkillContent)}
          />
        </div>
      )}
    </div>
  );
};
