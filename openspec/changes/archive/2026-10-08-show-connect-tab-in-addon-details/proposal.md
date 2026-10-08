# Proposal

## Why

The catalog shows a **Connect** tab with the entity's endpoint and code examples (the MCP endpoint of a toolset, the chat-completions endpoints of a model or agent). The add-on details popups hide it: `@epam/ai-dial-catalog` did not export the tab component, and `useEntityDetails` passed `dialCoreExternalUrl: null`. The catalog now exports `ApiTab` (`@epam/ai-dial-catalog` 1.2.0-dev.325, epam/ai-dial-chat#9338), and the DIAL Core URL is already in the app settings.

## What Changes

- `useEntityDetails` passes `settings.dialCoreExternalUrl` (`AppContext`) to `useCatalogItemDetails`, so details carry `details.api`.
- Agents map `supportsMcp` (`doesAgentSupportMcp`), so an MCP agent's Connect shows its MCP endpoint as in the catalog.
- `AddOnDetailsPopup` keeps Connect in the tab list when the URL is set (`isConnectHidden` otherwise) and renders `ApiTab` with translated labels.
- The library bump to 1.2.0-dev.325 (all `@epam/ai-dial-*` chat libs together, their peers pin one version) is part of this change.

## Capabilities

### Modified Capabilities

- `catalog-entity-details`: Connect is shown when connectable and a DIAL Core URL is configured.

## Impact

- Changed: `src/hooks/use-entity-details.ts`, `src/utils/map-agent-to-catalog-item.ts`, `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`, `src/types/entity-details.ts`, `src/hooks/use-catalog-details-labels.ts`, `src/constants/i18n.ts`, `src/i18n/locales/quick-app-editor.json`, `package.json`, `package-lock.json`, tests.
- No new request: the Connect data is built client-side from the URL and the entity id.
