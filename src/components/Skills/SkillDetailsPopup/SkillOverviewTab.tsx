import { FC, useMemo } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { DialSkill } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import { Translation } from '@/types/translation';
import { getSkillOverviewRows } from '@/utils/map-skill-to-catalog-item';

export interface SkillOverviewTabProps {
  skill: DialSkill;
}

/** The Overview tab: the skill's listing metadata as label/value rows. */
export const SkillOverviewTab: FC<SkillOverviewTabProps> = ({ skill }) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { userBucket } = useDataContext();

  const rows = useMemo(
    () =>
      getSkillOverviewRows(skill, {
        userBucket,
        language,
        scopeLabels: {
          [ResourceScope.Personal]: tCommon(CommonI18nKeys.PersonalScope),
          [ResourceScope.Shared]: tCommon(CommonI18nKeys.SharedScope),
          [ResourceScope.Organization]: tCommon(CommonI18nKeys.OrganizationScope),
        },
        labels: {
          author: t(QuickAppEditorI18nKeys.SkillAuthor),
          folder: t(QuickAppEditorI18nKeys.SkillFolder),
          updated: t(QuickAppEditorI18nKeys.SkillUpdated),
          version: t(QuickAppEditorI18nKeys.SkillVersion),
        },
      }),
    [skill, userBucket, language, t, tCommon],
  );

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
      {rows.map(({ label, value }) => (
        <div key={label} className="contents">
          <dt className="dial-small-text text-secondary">{label}</dt>
          <dd className="dial-small-text min-w-0 break-words text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
};
