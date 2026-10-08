# Design

## Decisions

1. **Gate on the URL.** Without `dialCoreExternalUrl` the catalog would build relative endpoints (`'' + path`), so the popup passes `isConnectHidden: !dialCoreExternalUrl`.
2. **Agent MCP flag.** `mapAgentToCatalogItem` sets `supportsMcp: doesAgentSupportMcp(agent)`, the rule the catalog mapper uses (`features.mcp`).
3. **Labels.** `ApiTab`'s ten strings come from `quickAppEditor` keys (English values equal the catalog defaults), exposed from `useCatalogDetailsLabels` as `tabs.connect`; the tab label is `ConnectTab` ("Connect").
