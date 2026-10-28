## 1. Schema defaults reader

- [x] 1.1 Add `src/utils/application-schema-defaults.ts` with `getApplicationSchemaDefaults(schema)` reading
      `properties.orchestrator.properties.deployment.default.deployment_id` from the property node.
- [x] 1.2 Unit tests in `src/utils/tests/application-schema-defaults.test.ts`: default beside `$ref`, no default,
      `null`, malformed schema, undefined schema.

## 2. Load

- [x] 2.1 In `fetchDialApp` call `applicationsApi.getApplicationSchema` when `applicationTypeSchemaId` is set,
      best-effort; add `schemaDefaults` to `DialApp` (`src/types/dial-entities.ts`).
- [x] 2.2 Tests in `src/utils/tests/` for success, failure and missing id.

## 3. Form

- [x] 3.1 Add the schema default model to `resolveDefaultModelId` (loaded and tool-capable), thread it through
      `getQuickApp2FormData`, `QuickApp2FormExternalState` and the `SYNC_EXTERNAL` reducer.
- [x] 3.2 Tests: precedence, unusable default, stored model kept, not dirty, saved `deployment_id`.

## 4. Resolve `$ref` and read more defaults

- [x] 4.1 Resolve local `$ref` (keywords beside it win), unwrap optional-object `anyOf`, guard against missing
      and circular refs.
- [x] 4.2 Extend `ApplicationSchemaDefaults` and the reader with `conversationStarters` (`introText`,
      `autoSubmit`, `chatMessageInputDisabled`), `addAttachment` and `webFetch`; ignore wrong types.
- [x] 4.3 Tests against the shapes of the real schema: `$ref` target, `anyOf` wrapper, circular and missing refs,
      wrong types.

## 5. Form

- [x] 5.1 `getQuickApp2FormData` takes `ApplicationSchemaDefaults`; apply `addAttachment` / `webFetch` in the
      "never stored" branch, and conversation starters only when no `conversation_starters` is stored. Pass the
      object from `QuickApp2Form` and Edit JSON.
- [x] 5.2 Form tests: schema defaults, no schema default keeps `true`, stored `null` stays off, stored
      conversation starters without `intro_text` stay empty, not dirty.

## 6. Temperature

- [x] 6.1 Read `orchestrator.deployment.parameters.temperature.default` (number in `MIN_TEMPERATURE`..`MAX_TEMPERATURE`)
      into `ApplicationSchemaDefaults.temperature` and use it in `getQuickApp2FormData` before `DEFAULT_TEMPERATURE`.
- [x] 6.2 Reader tests (valid, `0`, `null`, out of range, wrong type) and form tests (default, stored wins, not
      dirty).

## 7. Docs and checks

- [x] 7.1 `openspec validate respect-application-schema-defaults --strict`; typecheck, lint, tests.
