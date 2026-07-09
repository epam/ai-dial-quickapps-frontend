import { FC, memo } from 'react';
import { Control, Controller } from 'react-hook-form';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';

import { ConversationStartersList } from './ConversationStartersField';
import { StartersBehaviourRadioGroup } from './StartersBehaviourRadioGroup';

import { DialFormItem, DialInput } from '@epam/ai-dial-ui-kit';

export interface ConversationStartersSectionProps {
  control: Control<QuickApp2FormType>;
  isReadonly: boolean;
  hasStarters: boolean;
  startersSettingsTooltip?: string;
  autoSubmit: boolean;
  chatMessageInputDisabled: boolean;
}

const ConversationStartersSection: FC<ConversationStartersSectionProps> = ({
  control,
  isReadonly,
  hasStarters,
  startersSettingsTooltip,
  autoSubmit,
  chatMessageInputDisabled,
}) => {
  const { t } = useTranslation(Translation.Marketplace);

  return (
    <FormCollapsibleSection
      name={t(MarketplaceI18nKeys.ConversationStarters)}
      description={t(MarketplaceI18nKeys.StartersDescription)}
    >
      <div className="mb-4">
        <Controller
          control={control}
          name="starters"
          render={({ field }) => (
            <ConversationStartersList
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={isReadonly}
            />
          )}
        />
      </div>

      {/* Starters settings — always visible; controls disabled until a valid starter exists */}
      <div className="mt-1 flex flex-col gap-3">
        <div>
          <h3 className="dial-small-semi-text">{t(MarketplaceI18nKeys.StartersSettings)}</h3>
          <p className="dial-small-text mt-1 text-secondary">
            {t(MarketplaceI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings)}
          </p>
        </div>

        <Controller
          control={control}
          name="introText"
          render={({ field }) => (
            <DialInput
              labelProps={{
                label: t(MarketplaceI18nKeys.IntroText),
                caption: t(MarketplaceI18nKeys.OptionalTextShownAboveTheStarters),
              }}
              value={field.value ?? ''}
              onChange={(val) => field.onChange(val ?? '')}
              disabled={isReadonly || !hasStarters}
              placeholder={t(MarketplaceI18nKeys.EnterIntroText)}
              containerClassName="w-full"
              tooltipText={startersSettingsTooltip}
            />
          )}
        />

        <DialFormItem label={t(MarketplaceI18nKeys.StartersBehavior)}>
          <Controller
            control={control}
            name="autoSubmit"
            render={({ field }) => (
              <StartersBehaviourRadioGroup
                value={field.value}
                onChange={field.onChange}
                disabled={isReadonly || !hasStarters}
                tooltip={startersSettingsTooltip}
              />
            )}
          />
        </DialFormItem>

        <Controller
          control={control}
          name="chatMessageInputDisabled"
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <p className="dial-small-text font-medium">
                {t(MarketplaceI18nKeys.DisableChatInput)}
              </p>
              <ToggleSwitch
                isOn={field.value}
                handleSwitch={() => field.onChange(!field.value)}
                disabled={isReadonly || !hasStarters}
                additionalText={t(MarketplaceI18nKeys.DisableChatInputSoUsersCanOnlyUseStarters)}
                tooltip={startersSettingsTooltip}
                warning={
                  !autoSubmit && chatMessageInputDisabled
                    ? t(MarketplaceI18nKeys.PayAttentionTheUserWontBeAbleToEdit)
                    : undefined
                }
              />
            </div>
          )}
        />
      </div>
    </FormCollapsibleSection>
  );
};

export default memo(ConversationStartersSection);
