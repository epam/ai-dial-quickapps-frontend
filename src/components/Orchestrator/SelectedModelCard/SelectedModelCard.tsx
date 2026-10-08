import { FC } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import type { DialModel } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { getLocalizedText } from '@/utils/get-localized-text';
import { resolveIconUrl } from '@/utils/resolve-icon-url';
import {
  EntityIdentity,
  EntityType,
  ErrorText,
  mergeClasses,
  Skeleton,
  SkeletonVariant,
} from '@epam/ai-dial-ui-kit';

export interface SelectedModelCardProps {
  /** The saved model id, shown as-is when it isn't among the loaded models. */
  modelId: string;
  model?: DialModel;
  isLoading: boolean;
  isDisabled?: boolean;
  error?: string;
}

const SKELETON_COLOR = 'var(--bg-control-neutral-active, #D1DBEA)';

const CardSkeleton: FC = () => (
  <div className="flex items-center gap-2">
    <Skeleton variant={SkeletonVariant.Circular} width={44} height={44} color={SKELETON_COLOR} />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <Skeleton variant={SkeletonVariant.Text} width="30%" height={12} color={SKELETON_COLOR} />
      <Skeleton variant={SkeletonVariant.Text} width="60%" height={16} color={SKELETON_COLOR} />
    </div>
  </div>
);

/** The Default model block's card: the selected model's identity, a loading skeleton, or the raw id. */
export const SelectedModelCard: FC<SelectedModelCardProps> = ({
  modelId,
  model,
  isLoading,
  isDisabled,
  error,
}) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);

  const renderContent = () => {
    if (isLoading) return <CardSkeleton />;

    if (model == null) {
      return (
        <span className="dial-body-semi-text block truncate text-secondary">
          {modelId || t(QuickAppEditorI18nKeys.SelectModel)}
        </span>
      );
    }

    return (
      <EntityIdentity
        item={{
          type: EntityType.Model,
          name: getLocalizedText(model.name, language, model.id),
          version: model.version,
          iconUrl: model.iconUrl ? resolveIconUrl(model.iconUrl) : undefined,
        }}
        labels={{ type: t(QuickAppEditorI18nKeys.Model) }}
        hasFeaturedTag={false}
        iconSize={44}
        headingLevel={4}
        nameClassName="dial-body-semi-text"
      />
    );
  };

  return (
    <div>
      <div
        className={mergeClasses(
          'rounded-[16px] border bg-layer-raised p-3',
          error ? 'border-error' : 'border-tertiary',
          isDisabled && 'opacity-50',
        )}
      >
        {renderContent()}
      </div>
      <ErrorText text={error} className="mt-1 block" />
    </div>
  );
};
