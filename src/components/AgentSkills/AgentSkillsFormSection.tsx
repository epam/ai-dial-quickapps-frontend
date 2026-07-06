import { FC, memo } from "react";
import { Control, Controller } from "react-hook-form";

import { MarketplaceI18nKeys } from "@/constants/i18n";
import { QuickApp2Form as QuickApp2FormType } from "@/form/quickApp2Form";
import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";

import { FormCollapsibleSection } from "@/components/common/FormCollapsibleSection";

import { AgentSkillsField } from "./AgentSkillsField";

export interface AgentSkillsFormSectionProps {
  control: Control<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
}

const AgentSkillsFormSection: FC<AgentSkillsFormSectionProps> = ({
  control,
  isReadonly,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.Marketplace);

  return (
    <FormCollapsibleSection
      name={t(MarketplaceI18nKeys.AgentSkills)}
      description={t(MarketplaceI18nKeys.AgentSkillsDescription)}
    >
      <Controller
        control={control}
        name="agentSkills"
        render={({ field }) => (
          <AgentSkillsField
            value={field.value}
            onChange={field.onChange}
            readonly={isReadonly}
            tooltip={tooltip}
          />
        )}
      />
    </FormCollapsibleSection>
  );
};

export default memo(AgentSkillsFormSection);
