Slicing strategy: **vertical**. Slice 1 makes the shell able to host an app tab.
Slice 2 delivers the Settings tab end to end for transport. Slice 3 moves
Credentials into it and removes the action row and the old dialog. Slice 4 covers
i18n, RTL and docs. Each slice leaves the app working and its tests green.

## 1. Shell: app-owned tabs

- [x] 1.1 Add the string enum `AppDetailsTab { Settings = 'settings' }` and widen
      `AddOnDetailsTab` to `CatalogDetailsTab | AppDetailsTab` in
      `src/types/entity-details.ts`. Add an `AddOnAppTab` interface with `id`,
      `label` and `content`. Keep `CatalogTabsLabels.tabs` keyed by `CatalogDetailsTab`
      only, since app tab labels arrive already translated.
  - Verification: `npm run typecheck`.
- [x] 1.2 In `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`:
  - add the optional `appTabs?: AddOnAppTab[]` prop;
  - append those tabs after `getCatalogDetailsTabs(...)`;
  - take labels from the app tab for non-catalog ids;
  - render the app tab's `content` in `renderPanel`'s default branch;
  - render no app tabs in the unavailable state;
  - keep the selection fallback rule.
  - Verification: `npx vitest run src/components/common/AddOnDetailsPopup/tests/AddOnDetailsPopup.test.tsx`,
    `npm run lint`, `npm run typecheck`.
- [x] 1.3 Tests in `src/components/common/AddOnDetailsPopup/tests/AddOnDetailsPopup.test.tsx`,
      using role and text queries:
  - an app tab is listed after the catalog tabs, with About selected;
  - selecting it shows its content in the tabpanel;
  - no app tab is shown in the unavailable state;
  - a tab appearing later does not change the selection.
  - Verification: same Vitest file.

## 2. Settings tab: Connect via

- [x] 2.1 Add `canChooseAgentTransport(agent, modelsMap)` to
      `src/utils/map-agent-to-catalog-item.ts`. It is
      `canConfigureAgentTransport(agent) && modelsMap[agent.id] != null`. Unit tests in
      `src/utils/tests/map-agent-to-catalog-item.test.ts` cover:
  - an MCP application in `modelsMap`, which can choose;
  - an MCP-only application, which cannot;
  - a non-MCP application, which cannot;
  - a model, which cannot;
  - an undefined agent, which cannot.
  - Verification: `npx vitest run src/utils/tests/map-agent-to-catalog-item.test.ts`,
    `npm run lint`, `npm run typecheck`.
- [x] 2.2 Confirm the current `RadioGroup` props with the ui-kit MCP tool
      (`getEntityDetails("component", "RadioGroup")`). Then create
      `src/components/Agents/AgentSettingsTab/AgentSettingsTab.tsx` with
      `AgentSettingsTabProps` (design §2). For now it renders only the "Connect via"
      section:
  - a `RadioGroup` labelled `ConnectVia`;
  - options `MCP` and `ChatCompletion`;
  - `value = transport ?? DialAppTransportType.MCP`;
  - `disabled = isTransportDisabled`;
  - `onChange` cast to `DialAppTransportType`.
    The component is presentational and holds no state.
  - Verification: `npm run lint`, `npm run typecheck`.
- [x] 2.3 In `src/components/Agents/AgentDetailsPopup/AgentDetailsPopup.tsx`:
  - compute `isTransportVisible` with `canChooseAgentTransport(agent, modelsMap)`,
    in editable and read-only apps;
  - define `handleTransportChange` with `useCallback`, calling `onConfigure`;
  - build a memoised `appTabs` holding the Settings tab (label `Settings`) when a
    section is visible;
  - pass it to `AddOnDetailsPopup`.
  - Remove the Connection button, the `isConfiguring` state and the
    `DialAppConfigurationModal` render.
  - Verification: `npx vitest run src/components/Agents/AgentDetailsPopup/tests/AgentDetailsPopup.test.tsx`,
    `npm run lint`, `npm run typecheck`.
- [x] 2.4 Update `src/components/Agents/AgentDetailsPopup/tests/AgentDetailsPopup.test.tsx`.
      Replace the Connection/dialog tests with:
  - the Settings tab is listed last for an MCP and chat-completion application;
  - "Connect via" preselects MCP when no transport is saved;
  - a saved `chat-completion` is checked;
  - selecting "Chat Completion" calls `onConfigure(id, 'chat-completion')`, and
    the popup stays open on Settings;
  - read-only shows the group disabled;
  - a model and an MCP-only agent without credentials get no Settings tab;
  - an unavailable agent gets no Settings tab.
    Add `src/components/Agents/AgentSettingsTab/tests/AgentSettingsTab.test.tsx` for
    the panel's sections and their visibility props.
  - Verification: both Vitest files, then the full `npm test` once the slice is done.

## 3. Settings tab: Credentials, and removals

- [x] 3.1 Add the Credentials section to `AgentSettingsTab`: a heading
      `AgentCredentialsSection`, then a `GhostButton` with label
      `ApplicationCredentials` and a leading `IconKey` that calls
      `onRequestCredentials`.
  - In `AgentDetailsPopup`, pass `isCredentialsVisible` (the existing gate) and
    `onRequestCredentials`, which is
    `requestApplicationCredentials(agentId, settings.allowedOrigins)`.
  - Include credentials in the "tab has content" check.
  - Remove the `actions` row from `AgentDetailsPopup`.
  - Verification: `npx vitest run src/components/Agents/AgentDetailsPopup/tests/AgentDetailsPopup.test.tsx src/components/Agents/AgentSettingsTab/tests/AgentSettingsTab.test.tsx`,
    `npm run lint`, `npm run typecheck`.
- [x] 3.2 Remove the now unused `actions` prop and its `ps-[60px]` row from
      `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`. Update
      `AddOnDetailsPopup.test.tsx` if it covers that row.
  - Verification: `npx vitest run src/components/common/AddOnDetailsPopup/tests/AddOnDetailsPopup.test.tsx`,
    `npm run lint`, `npm run typecheck`.
- [x] 3.3 Delete `src/components/Agents/DialAppConfigurationModal/`, after
      confirming with a search that nothing else imports it.
  - Verification: `npm run typecheck`, `npm run lint`.
- [x] 3.4 Credentials tests in `AgentDetailsPopup.test.tsx`:
  - with `applicationCredentials=true` and a needed auth, Settings shows
    Credentials, and activating it posts exactly one
    `REQUEST_APPLICATION_CREDENTIALS { appId }`;
  - without the flag there is no section;
  - an MCP-only agent needing auth gets a credentials-only Settings tab;
  - read-only shows no Credentials;
  - no button is rendered between the header and the tab row.
  - Verification: the Vitest file, then the full `npm test` once the slice is done.

## 4. i18n, RTL and docs

- [x] 4.1 i18n:
  - add `AgentCredentialsSection = 'Credentials'` to `QuickAppEditorI18nKeys` in
    `src/constants/i18n.ts`;
  - add `"Credentials": "Credentials"` to `src/i18n/locales/quick-app-editor.json`,
    the only locale file;
  - remove `AgentConnection` and `ApplyChanges` from the enum, and their JSON
    entries (`"Connection"`, `"Apply changes"`), unless a search shows another user.
  - Verification: `npm run typecheck`, `npm run lint`, full `npm test`.
- [x] 4.2 RTL check for `AgentSettingsTab`:
  - only logical spacing and alignment classes (`ms`/`me`, `ps`/`pe`,
    `text-start`);
  - no mirrored icons, since the key icon is not directional;
  - add an RTL render test in `AgentSettingsTab.test.tsx` with
    `document.documentElement.dir = 'rtl'` asserting the controls render and keep
    their accessible names.
  - Verification: `npx vitest run src/components/Agents/AgentSettingsTab/tests/AgentSettingsTab.test.tsx`.
- [x] 4.3 Docs:
  - `docs/TECH_DEBT.md`: if it lists the agent transport dialog, the Connection
    action, or the action-row/nested-dialog duplication, remove or update that
    entry;
  - README: no change expected, since no config or env change is involved.
  - Verification: `npm run format:check`.

## 5. Follow-ups (out of scope, record only)

- [x] 5.1 Record in `docs/TECH_DEBT.md`: the transport default lives in
      `src/form/quickApp2Form.ts:398` (`?? MCP`) and is duplicated by the Settings
      tab's display default. Consider a single exported constant.

## 6. Review rework: Credentials back under the header

- [x] 6.1 Restore the optional `actions` prop and its `ps-[60px]` row in
      `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`, with the
      "indents the action row under the name" test in
      `src/components/common/AddOnDetailsPopup/tests/AddOnDetailsPopup.test.tsx`.
  - Verification: that Vitest file, `npm run lint`, `npm run typecheck`.
- [x] 6.2 In `src/components/Agents/AgentDetailsPopup/AgentDetailsPopup.tsx`, render
      Credentials in `actions` (same gate). Its handler calls `onClose()` and then
      `requestApplicationCredentials`. Pass the Settings tab only when
      `canChooseAgentTransport` holds.
  - Verification: `npx vitest run src/components/Agents/AgentDetailsPopup/tests/AgentDetailsPopup.test.tsx`.
- [x] 6.3 Reduce `src/components/Agents/AgentSettingsTab/AgentSettingsTab.tsx` to the
      Connect via group (drop `isTransportVisible`, `isCredentialsVisible`,
      `onRequestCredentials`) and update its tests. Drop the `AgentCredentialsSection`
      key from `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`.
  - Verification: `npx vitest run src/components/Agents/AgentSettingsTab`, full `npm test`.
- [x] 6.4 Popup tests: Credentials sit before the tab row and not in Settings;
      activating them closes the popup and posts one host message; an MCP-only agent
      behind auth shows Credentials and no Settings tab; read-only shows no Credentials.
  - Verification: the AgentDetailsPopup Vitest file.
