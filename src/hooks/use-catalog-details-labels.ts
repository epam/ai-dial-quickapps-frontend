import type { AttachmentCanvasBodyLabels } from '@epam/ai-dial-attachment-canvas';
import { CatalogDetailsTab } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { useMemo } from 'react';

import { ApplicationEditorI18nKeys, AttachmentCanvasI18nKeys, BasicI18nKeys, ButtonsI18nKeys, CatalogI18nKeys, ChatI18nKeys, ToolsetSigninI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';
import type { CatalogMapperLabels, CatalogTabsLabels } from '@/types/entity-details';

export interface CatalogDetailsLabels {
  tabs: CatalogTabsLabels;
  mappers: CatalogMapperLabels;
  /** The attachment canvas texts of a skill package file preview. */
  canvas: AttachmentCanvasBodyLabels;
}

/**
 * Translated texts for the catalog details tabs and the catalog mappers, so
 * no English catalog default reaches the popups. Memoised on the language:
 * `useCatalogItemDetails` recreates its fetcher whenever a label object
 * changes.
 */
export const useCatalogDetailsLabels = (): CatalogDetailsLabels => {
  const { t } = useTranslation();

  return useMemo(() => {
    const author = t(CatalogI18nKeys.DetailsSkillAuthor);
    const lastUpdated = t(CatalogI18nKeys.DetailsOverviewLastUpdated);
    const specification = t(CatalogI18nKeys.DetailsOverviewSpecification);

    return {
      tabs: {
        tabs: {
          [CatalogDetailsTab.About]: t(CatalogI18nKeys.DetailsTabAbout),
          [CatalogDetailsTab.Content]: t(CatalogI18nKeys.DetailsTabContent),
          [CatalogDetailsTab.Overview]: t(CatalogI18nKeys.DetailsTabOverview),
          [CatalogDetailsTab.Pricing]: t(CatalogI18nKeys.DetailsTabPricing),
          [CatalogDetailsTab.Limits]: t(CatalogI18nKeys.DetailsTabLimits),
          [CatalogDetailsTab.Tools]: t(CatalogI18nKeys.DetailsTabTools),
          [CatalogDetailsTab.Api]: t(CatalogI18nKeys.DetailsTabConnect),
        },
        yes: t(CatalogI18nKeys.DetailsOverviewYes),
        no: t(CatalogI18nKeys.DetailsOverviewNo),
        tools: {
          inputName: t(CatalogI18nKeys.DetailsToolsInputName),
          inputType: t(CatalogI18nKeys.DetailsToolsInputType),
          inputRequired: t(CatalogI18nKeys.DetailsToolsInputRequired),
          annotationKey: t(CatalogI18nKeys.DetailsToolsAnnotationKey),
          annotationValue: t(CatalogI18nKeys.DetailsToolsAnnotationValue),
          searchPlaceholder: t(CatalogI18nKeys.DetailsToolsSearchPlaceholder),
          searchClearLabel: t(BasicI18nKeys.ClearSearch),
          toolCount: (count: number) =>
            t(CatalogI18nKeys.DetailsToolCount, { count: String(count) }),
          noResults: t(BasicI18nKeys.NoResults),
        },
        pricesSection: t(CatalogI18nKeys.DetailsPricingPricesSection),
        characterPricesSection: t(CatalogI18nKeys.DetailsPricingCharacterPricesSection),
        usageLimitsSection: t(CatalogI18nKeys.DetailsPricingLimitsSection),
        loading: t(CatalogI18nKeys.DetailsLoading),
        failed: t(CatalogI18nKeys.DetailsLoadError),
        retry: t(ButtonsI18nKeys.Retry),
        markdown: {
          codeBlockCopyLabel: t(ChatI18nKeys.CopyCode),
          codeBlockCopiedLabel: t(ButtonsI18nKeys.Copied),
          codeBlockDownloadLabel: t(ChatI18nKeys.DownloadCode),
          tableScrollRegionAriaLabel: t(ChatI18nKeys.ScrollableTable),
          mathScrollRegionAriaLabel: t(ChatI18nKeys.ScrollableFormula),
        },
        contentFiles: {
          selector: t(CatalogI18nKeys.DetailsContentFileSelectorAriaLabel),
          count: (count: number) =>
            t(CatalogI18nKeys.DetailsContentFileCount, { count: String(count) }),
          loading: t(CatalogI18nKeys.DetailsContentFileLoading),
          unsupported: t(CatalogI18nKeys.DetailsContentFileUnsupported),
          error: t(CatalogI18nKeys.DetailsContentFileError),
        },
        connect: {
          resourceSectionLabel: t(CatalogI18nKeys.DetailsApiResourceSection),
          endpointSectionLabel: t(CatalogI18nKeys.DetailsApiEndpoint),
          snippetSectionLabel: t(CatalogI18nKeys.DetailsApiSnippetSection),
          modelIdLabel: t(CatalogI18nKeys.DetailsApiModelId),
          endpointLabel: t(CatalogI18nKeys.DetailsApiEndpoint),
          requestExampleLabel: t(CatalogI18nKeys.DetailsApiRequestExample),
          responseSchemaLabel: t(CatalogI18nKeys.DetailsApiResponseSchema),
          copyAriaLabel: t(ButtonsI18nKeys.Copy),
          copiedStatusLabel: t(ButtonsI18nKeys.Copied),
        },
        header: {
          hasPrimaryAction: false,
          loginActionLabel: t(ButtonsI18nKeys.LogIn),
          logoutActionLabel: t(ButtonsI18nKeys.LogOut),
          apiKeyActionLabel: t(ToolsetSigninI18nKeys.ApiKeyLabel),
          changeApiKeyActionLabel: t(CatalogI18nKeys.CredentialsChangeApiKeyActionLabel),
          personalApiKeyPanelTitle: t(CatalogI18nKeys.CredentialsPersonalApiKeyPanelTitle),
          personalApiKeyAddedMessage: t(CatalogI18nKeys.CredentialsPersonalApiKeyAddedMessage),
          apiKeyFieldLabel: t(ToolsetSigninI18nKeys.ApiKeyLabel),
          apiKeyHeaderHint: (header: string) =>
            t(CatalogI18nKeys.CredentialsApiKeyHeaderHint, { header }),
          apiKeyRequiredErrorMessage: t(CatalogI18nKeys.CredentialsApiKeyRequiredErrorMessage),
          addApiKeyActionLabel: t(ButtonsI18nKeys.Add),
          addingApiKeyStatusLabel: t(CatalogI18nKeys.CredentialsAddingApiKeyStatusLabel),
          apiKeyAddedLabel: (when: string) => t(CatalogI18nKeys.CredentialsApiKeyAddedLabel, { when }),
          // The popover's "Delete" removes the API key; the same word as the footer's Delete.
          deleteActionLabel: t(ButtonsI18nKeys.Delete),
          deletingStatusLabel: t(CatalogI18nKeys.DetailsCredentialsDeletingApiKeyStatusLabel),
          entityTypeLabels: {
            [CatalogEntityType.Skill]: t(CatalogI18nKeys.DetailsSkillSection),
            [CatalogEntityType.Toolset]: t(ApplicationEditorI18nKeys.ToolsetsTypeLabel),
            [CatalogEntityType.Agent]: t(ApplicationEditorI18nKeys.AgentsTypeLabel),
            [CatalogEntityType.Model]: t(ApplicationEditorI18nKeys.OrchestratorModel),
          },
        },
      },
      // Visualizer and cited-location labels are left out: a skill file has neither.
      canvas: {
        unsupportedLabel: t(CatalogI18nKeys.DetailsContentFileUnsupported),
        loadErrorLabel: t(CatalogI18nKeys.DetailsContentFileError),
        forbiddenErrorLabel: t(AttachmentCanvasI18nKeys.ForbiddenErrorLabel),
        htmlFrameBlockedLabel: t(AttachmentCanvasI18nKeys.HtmlFrameBlocked),
        htmlOpenInNewTabLabel: t(AttachmentCanvasI18nKeys.HtmlOpenInNewTab),
        pdfThumbnailsLabel: t(AttachmentCanvasI18nKeys.PdfThumbnailsLabel),
        pdfShowThumbnailsLabel: t(AttachmentCanvasI18nKeys.PdfShowThumbnailsLabel),
        pdfHideThumbnailsLabel: t(AttachmentCanvasI18nKeys.PdfHideThumbnailsLabel),
        pdfPageNumberLabel: t(AttachmentCanvasI18nKeys.PdfPageNumberLabel),
        pdfContentLoadingLabel: t(AttachmentCanvasI18nKeys.PdfContentLoadingLabel),
        pdfContentErrorLabel: t(AttachmentCanvasI18nKeys.PdfContentErrorLabel),
        pdfContentRetryLabel: t(ButtonsI18nKeys.Retry),
        xlsxFormulaLabel: t(AttachmentCanvasI18nKeys.XlsxFormulaLabel),
        codeContentLoadingLabel: t(AttachmentCanvasI18nKeys.CodeContentLoadingLabel),
        codeContentErrorLabel: t(AttachmentCanvasI18nKeys.CodeContentErrorLabel),
        codeContentRetryLabel: t(ButtonsI18nKeys.Retry),
        tableCopyLabel: t(ButtonsI18nKeys.Copy),
        tableCopiedLabel: t(ButtonsI18nKeys.Copied),
        tableDownloadCsvLabel: t(ButtonsI18nKeys.DownloadAsCsv),
        codeBlockCopyLabel: t(ChatI18nKeys.CopyCode),
        codeBlockCopiedLabel: t(ButtonsI18nKeys.Copied),
        codeBlockDownloadLabel: t(ChatI18nKeys.DownloadCode),
        tableScrollRegionAriaLabel: t(ChatI18nKeys.ScrollableTable),
        mathScrollRegionAriaLabel: t(ChatI18nKeys.ScrollableFormula),
      },
      mappers: {
        entityDetails: {
          capabilitiesTitle: t(CatalogI18nKeys.DetailsOverviewCapabilities),
          specificationTitle: specification,
          configurationTitle: t(ApplicationEditorI18nKeys.Configuration),
          tools: t(CatalogI18nKeys.DetailsTabTools),
          parallelToolCalls: t(CatalogI18nKeys.DetailsOverviewParallelToolCalls),
          reasoningEfforts: t(CatalogI18nKeys.DetailsOverviewReasoningEfforts),
          skills: t(ApplicationEditorI18nKeys.SkillsTitle),
          provider: t(CatalogI18nKeys.DetailsOverviewProvider),
          vendor: t(CatalogI18nKeys.DetailsOverviewVendor),
          license: t(CatalogI18nKeys.DetailsOverviewLicense),
          knowledgeCutoffDate: t(CatalogI18nKeys.DetailsOverviewKnowledgeCutoff),
          parameters: t(CatalogI18nKeys.DetailsOverviewParameters),
          hostedBy: t(CatalogI18nKeys.DetailsOverviewHostedBy),
          releaseDate: t(CatalogI18nKeys.DetailsOverviewReleaseDate),
          contextWindow: t(CatalogI18nKeys.DetailsOverviewContextWindow),
          maxOutputTokens: t(CatalogI18nKeys.DetailsOverviewMaxOutputTokens),
          inputModalities: t(CatalogI18nKeys.DetailsOverviewInputModalities),
          inputAttachments: t(CatalogI18nKeys.DetailsOverviewInputAttachments),
          routes: t(CatalogI18nKeys.DetailsOverviewRoutes),
          configurationSchema: t(CatalogI18nKeys.DetailsOverviewConfigurationSchema),
          authentication: t(CatalogI18nKeys.DetailsAuthentication),
          authorizationEndpoint: t(CatalogI18nKeys.DetailsOverviewAuthorizationEndpoint),
          tokenEndpoint: t(CatalogI18nKeys.DetailsOverviewTokenEndpoint),
          oauthScopes: t(CatalogI18nKeys.DetailsOverviewOAuthScopes),
        },
        deploymentLimits: {
          tokenGroup: t(CatalogI18nKeys.DetailsLimitsTokenGroupLabel),
          tokensPerDay: t(CatalogI18nKeys.DetailsLimitsToday),
          tokensPerWeek: t(CatalogI18nKeys.DetailsLimitsThisWeek),
          tokensPerMonth: t(CatalogI18nKeys.DetailsLimitsThisMonth),
          followsCostLimit: t(CatalogI18nKeys.DetailsLimitsFollowsCostLimitLabel),
          formatValueLabel: (used, total) => t(CatalogI18nKeys.DetailsLimitsValue, { used, total }),
          formatProgressAriaLabel: ({ label, used, total }) =>
            t(CatalogI18nKeys.DetailsLimitsProgressAriaLabel, { label, used, total }),
          formatFollowsCostLimitAriaLabel: ({ label, used }) =>
            t(CatalogI18nKeys.DetailsLimitsFollowsCostLimitAriaLabel, { label, used }),
        },
        skillOverview: {
          whenToUseLabel: t(CatalogI18nKeys.DetailsSkillWhenToUse),
          allowedToolsLabel: t(CatalogI18nKeys.DetailsSkillAllowedTools),
          bundledResourcesLabel: t(CatalogI18nKeys.DetailsSkillBundledResources),
          specificationSectionTitle: specification,
          authorLabel: author,
          updatedLabel: lastUpdated,
          fileCountLabel: t(CatalogI18nKeys.DetailsSkillFileCount),
          detailsSectionTitle: t(CatalogI18nKeys.DetailsSkillSection),
        },
        // Required by `useCatalogItemDetails`; prompts are never opened here.
        promptOverview: {
          authorLabel: author,
          updatedLabel: lastUpdated,
          sectionTitle: t(CatalogI18nKeys.DetailsSkillSection),
        },
      },
    };
  }, [t]);
};
