1. Model selection - there should be popup on click, and it should have content as before
2. context and tools - popup should be as in old app (but use ui kit!), and in result input it seems to be missing configuration logic
3. context files - add logic is not implemented at all
4. agent skills - add logic is not implemented at all
5. conversation starters are missing a lot of functionality
6. Here is a thorough summary of the current state of every file you asked about.

   ***

   QuickApp2Form Component Survey
   1. ModelField.tsx — FULLY IMPLEMENTED

   What works:
   - Custom searchable dropdown built from scratch (no library component)
   - Pulls models from DataContext, filters to type === 'model' | 'application'
   - Real-time search filtering by name or id
   - Displays selected model's display name with fallback to raw id, then i18n placeholder
   - Shows version sub-line in each list item
   - Error display (border-error + message paragraph)
   - Disabled state with cursor-not-allowed opacity-50
   - Closes and clears search on selection

   Missing / gaps:
   - No click-outside-to-close logic — the dropdown only closes when an item is selected or the toggle button is pressed again; clicking elsewhere in the page leaves it open
   - The empty-state list item reuses the SelectModel i18n key instead of a "No results" key

   ***
   2. AgentsAndToolsetsField.tsx — FULLY IMPLEMENTED

   What works:
   - Dual-mode UI: chip-based selector (AgentAndToolsetSelector) and full Monaco JSON editor (DialJsonEditor)
   - Toggle between modes via ToggleSwitch; switching back from JSON validates and parses first
   - JSON mode has fullscreen expand/collapse with fixed overlay
   - Discard + Save JSON buttons in JSON mode
   - DialAppConfigurationModal is opened per-chip for agents that pass isApplicationId(), populated with the existing transport value from form state
   - handleConfigureSave patches the correct entry in agentsAndToolsets array with the new transport
   - Read-only mode passes through to all sub-components

   Missing / gaps:
   - Nothing stubbed out — this is the most complete field in the form

   ***
   3. AgentSkillsField.tsx — THIN WRAPPER, UNDERLYING SELECTOR IS A STUB

   What works:
   - Thin passthrough to AgentSkillsSelector
   - Renders a DialNoDataContent empty state when the list is empty
   - Renders raw promptId strings as list items
   - Remove button works (filters the id out of the array)

   What is stubbed / missing:
   - The "Add" button (DialLinkButton) has disabled hardcoded and onClick ise.preventDefault() only — no file/skill picker modal is wired
   - Items display raw URL strings, not resolved display names — there is no lookup againstany data source
   - AgentSkillsItem.tsx exists as a separate component but is not actually used insideAgentSkillsSelector (the selector inlines the same JSX directly)
   - No data fetching for skills — DataContext has no skills field at all

   ***
   4. CodeInterpreterField.tsx — FULLY IMPLEMENTED

   What works:
   - Reads settings.isCodeInterpreterEnabled from AppContext and returns null when disabled(feature-gated)
   - ToggleSwitch is fully wired: value binding, onChange, disabled, tooltip

   Missing / gaps:
   - Nothing — this is a straightforward feature-flag-gated toggle

   ***
   5. ConversationStartersField.tsx — FULLY IMPLEMENTED

   What works:
   - Dynamic list of (title, text) pairs via two DialInput fields per row
   - Auto-appends a blank row when the last row is edited (grow-as-you-type pattern)
   - Delete button on each row (hidden/pointer-events-none on the last/empty row)
   - Leading-whitespace trimming on single-char input
   - Container-level onBlur propagation using e.currentTarget.contains(e.relatedTarget)
   - Unique nanoid keys for React reconciliation

   Missing / gaps:
   - Nothing stubbed; fully functional list editor

   ***
   6. FilesSelector.tsx — UI PRESENT, ADD ACTION IS A STUB

   What works:
   - Renders existing files[] as a scrollable list with SelectedFile chips
   - Each chip shows the decoded filename (decodeApiUrl().split('/').pop())
   - Remove button calls onRemoveFile correctly
   - Empty state renders DialNoDataContent with i18n key
   - "Add" button is present and correctly disabled when readonly

   What is stubbed / missing:
   - handleOpenFilesModal calls onAddFiles?.([]) — it passes an empty array immediately; the comment explicitly says "FileManagerModal will be wired in W1-5 when DataContext is available"
   - There is no file browser / modal — clicking "Add" does nothing useful
   - DataContext has a files: string[] field and a FILES_LOADED action defined, but there is no fetchDialFiles() call anywhere in the effect — the files array is always [] and is never passed into FilesSelector

   ***
   7. DialAppConfigurationModal.tsx — FULLY IMPLEMENTED

   What works:
   - Resolves agent from modelsMap by agentId
   - Calls doesAgentSupportMcp(agent) to conditionally show the MCP radio option
   - Local selectedTransport state initialized from passed transport prop, or defaults toMCP if supported, else ChatCompletion
   - Two radio buttons fully wired
   - Cancel / Apply buttons call onClose / onSave(selectedTransport) correctly

   Missing / gaps:
   - No close-on-backdrop-click or Escape key handler — the modal can only be dismissed viathe two buttons
   - Uses a raw div overlay instead of a proper portal or modal component

   ***

   Contexts

   AppContext.tsx — Simple static provider. Holds app: DialApp, settings: AppSettings, isReady: boolean. Read-only, no dispatch. Provider is AppContext.Provider aliased asAppContextProvider — the actual data feeding is done at the page/layout level.

   DataContext.tsx — useReducer-based async loader. On isReady fires Promise.all([fetchDialModels(), fetchDialToolsets()]) and dispatches MODELS_LOADED +TOOLSETS_LOADED then READY. Exposes models, modelsMap, toolsets, toolsetsMap, files, status, error. The FILES_LOADED action and files state field exist but no code everdispatches FILES_LOADED — files are always an empty array.

   ThemeContext.tsx — Full theme system: fetches /api/themes, supports light/dark/system with OS preference detection, ?theme= query param override, localStorage persistence, CSS variable injection via applyThemeColors. Fully implemented.

   ***

   Utils

   api.ts — Pure URL encoding/decoding helpers plus isApplicationId (applications/ prefixcheck) and isToolsetId (toolsets/ prefix). No stubs.

   application.ts — Entity type checks (isQuickApp2, doesAgentSupportMcp, doesModelAllowTemperature, isEntityIdPublic), name extraction(getQuickAppItemNameFromConfig, getEntityDisplayName), MCP toolset id migration (migrateMCPToolsetIdName). All pure functions, fully implemented.

   dialClient.ts — Three API functions: fetchDialModels() (GET models + applications,merged), fetchDialToolsets() (GET toolsets), saveDialApp() (PUT application properties). There is no fetchDialFiles() function at all.

   apply-theme-colors.ts — Applies theme CSS variables to DOM. Utility only.

   auth-options.ts — NextAuth configuration. Not relevant to form state.

   ***

   Form Schema (quickApp2Form.ts) — FULLY IMPLEMENTED

   What works:
   - Complete Zod schema (QuickApp2Schema) for the entire form including agentsAndToolsets,starters, agentSkills, codeInterpreter, inputAttachmentTypes, maxInputAttachments, isJsonView, timestamp, etc.
   - superRefine cross-field validation: JSON array check when in JSON view, availableModelIds membership check, toolSupportingModelIds tools-capability check
   - getQuickApp2FormData() — hydrates form defaults from QuickApp2Config (app properties), handles agentsAndToolsets normalization via getAgentsAndToolsetsFormValue
   - buildQuickApp2Config() — serializes form state back to QuickApp2Config (the save payload)
   - getQuickApp2Toolsets() — classifies each form entry into the correct toolset type (DialApp, MCP, deployment simple tool, unknown, code interpreter)

   Missing / gaps:
   - inputAttachmentTypes is initialized as [] and maxInputAttachments as undefined in getQuickApp2FormData — there is no deserialization from appProperties for these fields(they exist in the schema and the save output but are not loaded back from the config)

   ***

   Summary of What Needs Work

   ┌──────────────────────────────────────────────┬───────────────────────────────────────────────┐
   │ Item │ Status │
   ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
   │ FilesSelector "Add" button │ Stub — no modal wired, passes emptyarray │
   ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
   │ DataContext file loading │ FILES_LOADED never dispatched,fetchDialFiles │
   │ │ doesn't exist │
   ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
   │ AgentSkillsSelector "Add" button │ Hardcoded disabled, no picker wired │
   ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
   │ AgentSkillsSelector display names │ Shows raw URLs, no name resolution │
   ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
   │ ModelField click-outside close │ Missing useClickOutside or equivalent │
   ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
   │ inputAttachmentTypes / maxInputAttachments │ Not deserialized from saved config │
   │ hydration │ │
   ├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
   │ DialAppConfigurationModal backdrop/Escape │ Not implemented │
   │ dismiss │ │
   └──────────────────────────────────────────────┴───────────────────────────────────────────────┘
