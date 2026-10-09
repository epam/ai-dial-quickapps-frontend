import { CatalogDetailsTab } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { useMemo } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import type { CatalogMapperLabels, CatalogTabsLabels } from '@/types/entity-details';
import { Translation } from '@/types/translation';

export interface CatalogDetailsLabels {
  tabs: CatalogTabsLabels;
  mappers: CatalogMapperLabels;
}

/**
 * Translated texts for the catalog details tabs and the catalog mappers, so
 * no English catalog default reaches the popups. Memoised on the language:
 * `useCatalogItemDetails` recreates its fetcher whenever a label object
 * changes.
 */
export const useCatalogDetailsLabels = (): CatalogDetailsLabels => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);

  return useMemo(() => {
    const author = t(QuickAppEditorI18nKeys.SkillAuthor);
    const lastUpdated = t(QuickAppEditorI18nKeys.OverviewLastUpdated);
    const specification = t(QuickAppEditorI18nKeys.OverviewSpecification);

    return {
      tabs: {
        tabs: {
          [CatalogDetailsTab.About]: t(QuickAppEditorI18nKeys.AboutTab),
          [CatalogDetailsTab.Content]: t(QuickAppEditorI18nKeys.SkillDetailsTab),
          [CatalogDetailsTab.Overview]: t(QuickAppEditorI18nKeys.SkillOverviewTab),
          [CatalogDetailsTab.Pricing]: t(QuickAppEditorI18nKeys.PricingTab),
          [CatalogDetailsTab.Limits]: t(QuickAppEditorI18nKeys.LimitsTab),
          [CatalogDetailsTab.Tools]: t(QuickAppEditorI18nKeys.ToolsTab),
          [CatalogDetailsTab.Api]: t(QuickAppEditorI18nKeys.ConnectTab),
        },
        yes: t(QuickAppEditorI18nKeys.OverviewYes),
        no: t(QuickAppEditorI18nKeys.OverviewNo),
        tools: {
          inputName: t(QuickAppEditorI18nKeys.ToolsInputName),
          inputType: t(QuickAppEditorI18nKeys.ToolsInputType),
          inputRequired: t(QuickAppEditorI18nKeys.ToolsInputRequired),
          annotationKey: t(QuickAppEditorI18nKeys.ToolsAnnotationKey),
          annotationValue: t(QuickAppEditorI18nKeys.ToolsAnnotationValue),
        },
        pricesSection: t(QuickAppEditorI18nKeys.PricingTokenSection),
        characterPricesSection: t(QuickAppEditorI18nKeys.PricingCharacterSection),
        usageLimitsSection: t(QuickAppEditorI18nKeys.PricingUsageLimitsSection),
        loading: t(QuickAppEditorI18nKeys.LoadingDetails),
        failed: t(QuickAppEditorI18nKeys.FailedToLoadDetails),
        retry: t(QuickAppEditorI18nKeys.Retry),
        markdown: {
          codeBlockCopyLabel: t(QuickAppEditorI18nKeys.MarkdownCopyCode),
          codeBlockCopiedLabel: t(QuickAppEditorI18nKeys.MarkdownCopiedCode),
          codeBlockDownloadLabel: t(QuickAppEditorI18nKeys.MarkdownDownloadCode),
          tableScrollRegionAriaLabel: t(QuickAppEditorI18nKeys.MarkdownTableScrollRegion),
          mathScrollRegionAriaLabel: t(QuickAppEditorI18nKeys.MarkdownMathScrollRegion),
        },
        contentFiles: {
          selector: t(QuickAppEditorI18nKeys.ContentFileSelectorAriaLabel),
          count: (count: number) =>
            t(QuickAppEditorI18nKeys.ContentFileCount, { count: String(count) }),
          loading: t(QuickAppEditorI18nKeys.ContentFileLoading),
          unsupported: t(QuickAppEditorI18nKeys.ContentFileUnsupported),
          error: t(QuickAppEditorI18nKeys.ContentFileError),
        },
        connect: {
          resourceSectionLabel: t(QuickAppEditorI18nKeys.ConnectResourceSection),
          endpointSectionLabel: t(QuickAppEditorI18nKeys.ConnectEndpoint),
          snippetSectionLabel: t(QuickAppEditorI18nKeys.ConnectSnippetSection),
          modelIdLabel: t(QuickAppEditorI18nKeys.ConnectModelId),
          endpointLabel: t(QuickAppEditorI18nKeys.ConnectEndpoint),
          requestExampleLabel: t(QuickAppEditorI18nKeys.ConnectRequestExample),
          responseSchemaLabel: t(QuickAppEditorI18nKeys.ConnectResponseSchema),
          copyAriaLabel: t(QuickAppEditorI18nKeys.ConnectCopy),
          copiedStatusLabel: t(QuickAppEditorI18nKeys.MarkdownCopiedCode),
        },
        header: {
          hasPrimaryAction: false,
          loginActionLabel: t(QuickAppEditorI18nKeys.LoginToolsetAction),
          logoutActionLabel: t(QuickAppEditorI18nKeys.LogoutToolsetAction),
          apiKeyActionLabel: t(QuickAppEditorI18nKeys.ApiKeyLabel),
          changeApiKeyActionLabel: t(QuickAppEditorI18nKeys.ToolsetChangeApiKeyAction),
          personalApiKeyPanelTitle: t(QuickAppEditorI18nKeys.PersonalApiKeyTitle),
          personalApiKeyAddedMessage: t(QuickAppEditorI18nKeys.PersonalApiKeyAdded),
          apiKeyFieldLabel: t(QuickAppEditorI18nKeys.ApiKeyLabel),
          apiKeyHeaderHint: (header: string) =>
            t(QuickAppEditorI18nKeys.ApiKeyHeaderHint, { header }),
          apiKeyRequiredErrorMessage: t(QuickAppEditorI18nKeys.ApiKeyRequired),
          addApiKeyActionLabel: tCommon(CommonI18nKeys.Add),
          addingApiKeyStatusLabel: t(QuickAppEditorI18nKeys.ApiKeyAdding),
          apiKeyAddedLabel: (when: string) => t(QuickAppEditorI18nKeys.ApiKeyAddedWhen, { when }),
          // The popover's "Delete" removes the API key; the same word as the footer's Delete.
          deleteActionLabel: t(QuickAppEditorI18nKeys.RemoveSkillFromApp),
          deletingStatusLabel: t(QuickAppEditorI18nKeys.ApiKeyDeleting),
          entityTypeLabels: {
            [CatalogEntityType.Skill]: t(QuickAppEditorI18nKeys.SkillTypeLabel),
            [CatalogEntityType.Toolset]: t(QuickAppEditorI18nKeys.ToolsetTypeLabel),
            [CatalogEntityType.Agent]: t(QuickAppEditorI18nKeys.AgentTypeLabel),
            [CatalogEntityType.Model]: t(QuickAppEditorI18nKeys.Model),
          },
        },
      },
      mappers: {
        entityDetails: {
          capabilitiesTitle: t(QuickAppEditorI18nKeys.OverviewCapabilities),
          specificationTitle: specification,
          configurationTitle: t(QuickAppEditorI18nKeys.Configuration),
          tools: t(QuickAppEditorI18nKeys.ToolsTab),
          parallelToolCalls: t(QuickAppEditorI18nKeys.OverviewParallelToolCalls),
          reasoningEfforts: t(QuickAppEditorI18nKeys.OverviewReasoningEfforts),
          skills: t(QuickAppEditorI18nKeys.Skills),
          provider: t(QuickAppEditorI18nKeys.OverviewProvider),
          vendor: t(QuickAppEditorI18nKeys.OverviewVendor),
          license: t(QuickAppEditorI18nKeys.OverviewLicense),
          knowledgeCutoffDate: t(QuickAppEditorI18nKeys.OverviewKnowledgeCutoff),
          parameters: t(QuickAppEditorI18nKeys.OverviewParameters),
          hostedBy: t(QuickAppEditorI18nKeys.OverviewHostedBy),
          releaseDate: t(QuickAppEditorI18nKeys.OverviewReleaseDate),
          contextWindow: t(QuickAppEditorI18nKeys.OverviewContextWindow),
          maxOutputTokens: t(QuickAppEditorI18nKeys.OverviewMaxOutputTokens),
          inputModalities: t(QuickAppEditorI18nKeys.OverviewInputModalities),
          inputAttachments: t(QuickAppEditorI18nKeys.OverviewInputAttachments),
          routes: t(QuickAppEditorI18nKeys.OverviewRoutes),
          configurationSchema: t(QuickAppEditorI18nKeys.OverviewConfigurationSchema),
          authentication: t(QuickAppEditorI18nKeys.DetailsAuthentication),
          authorizationEndpoint: t(QuickAppEditorI18nKeys.OverviewAuthorizationEndpoint),
          tokenEndpoint: t(QuickAppEditorI18nKeys.OverviewTokenEndpoint),
          oauthScopes: t(QuickAppEditorI18nKeys.OverviewOAuthScopes),
        },
        deploymentLimits: {
          tokenGroup: t(QuickAppEditorI18nKeys.LimitsTokenGroup),
          tokensPerDay: t(QuickAppEditorI18nKeys.LimitsToday),
          tokensPerWeek: t(QuickAppEditorI18nKeys.LimitsThisWeek),
          tokensPerMonth: t(QuickAppEditorI18nKeys.LimitsThisMonth),
          followsCostLimit: t(QuickAppEditorI18nKeys.LimitsFollowsCostLimit),
          formatValueLabel: (used, total) => t(QuickAppEditorI18nKeys.LimitsValue, { used, total }),
          formatProgressAriaLabel: ({ label, used, total }) =>
            t(QuickAppEditorI18nKeys.LimitsProgressAriaLabel, { label, used, total }),
          formatFollowsCostLimitAriaLabel: ({ label, used }) =>
            t(QuickAppEditorI18nKeys.LimitsFollowsCostLimitAriaLabel, { label, used }),
        },
        skillOverview: {
          whenToUseLabel: t(QuickAppEditorI18nKeys.SkillWhenToUse),
          allowedToolsLabel: t(QuickAppEditorI18nKeys.SkillAllowedTools),
          bundledResourcesLabel: t(QuickAppEditorI18nKeys.SkillBundledResources),
          specificationSectionTitle: specification,
          authorLabel: author,
          updatedLabel: lastUpdated,
          fileCountLabel: t(QuickAppEditorI18nKeys.SkillFileCount),
          detailsSectionTitle: t(QuickAppEditorI18nKeys.SkillTypeLabel),
        },
        // Required by `useCatalogItemDetails`; prompts are never opened here.
        promptOverview: {
          authorLabel: author,
          updatedLabel: lastUpdated,
          sectionTitle: t(QuickAppEditorI18nKeys.SkillTypeLabel),
        },
      },
    };
  }, [t, tCommon]);
};
