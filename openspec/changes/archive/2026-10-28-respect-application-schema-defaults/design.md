## Context

`fetchDialApp` (`src/utils/dial-client.ts`) loads details, then a best-effort summary. The form is built by
`getQuickApp2FormData` (`src/form/quickApp2Form.ts`) and resolves the model through `resolveDefaultModelId`,
which is also called from the `SYNC_EXTERNAL` reducer (`src/hooks/use-quick-app2-form.ts`) once models load. The
model fallback needs the loaded deployments, so the schema default must flow through both calls.

The real QuickApps schema (`myQA4-scheme.json`) puts the interesting defaults in three shapes:

- beside a `$ref`: `orchestrator.deployment` is `{ "$ref": "#/$defs/DialDeploymentConfig", "default": {...} }`;
- inside a definition: `ConversationStartersConfig`, `WebFetchConfig`, `RepresentationToolingConfig` carry
  per-property defaults (`intro_text`, `enabled`, `add_attachment`, ...);
- behind an optional wrapper: `conversation_starters` and `features` are `anyOf: [{ $ref }, { type: null }]`, with
  `default: null`, so the object's own default is `null` and the useful defaults are on its properties.

## Decisions

1. **Fetch in `fetchDialApp`, best-effort.** Wrap `getApplicationSchema` in a try/catch that yields no defaults.
   Store the result as `DialApp.schemaDefaults`, a small typed object (`ApplicationSchemaDefaults`), so the editor
   state stays serialisable and the form never sees raw JSON Schema.
2. **A small pure reader, no library.** `src/utils/application-schema-defaults.ts` resolves local `$ref`
   (JSON Pointer into the same document, with `~0`/`~1` and percent-decoding), lets keywords beside the `$ref`
   override the target (JSON Schema 2019-09+ behaviour, which is how `default` beside `$ref` is meant), and
   unwraps an `anyOf` / `oneOf` with exactly one non-null branch. A depth guard makes a circular or missing
   reference yield nothing. A library (`@apidevtools/json-schema-ref-parser`) would also handle remote refs and
   cycles, but it is a new dependency for a lookup this small, and remote refs are not used.
3. **Typed extraction, wrong types ignored.** The reader returns only the values the form edits, and only when
   the default has the expected type (string / boolean). Everything else is dropped.
4. **Model precedence:** stored, then schema default (loaded and tool-capable), then client-config default, then
   first tool model. An unusable schema default is skipped silently; the user cannot fix a backend default.
5. **`getQuickApp2FormData` takes the `ApplicationSchemaDefaults` object** as its last parameter, instead of one
   more positional id. Edit JSON passes the same object, so a pasted document without these keys gets the same
   defaults as a new app.
6. **Conversation starters defaults apply only when no `conversation_starters` object is stored.** The save
   writes `intro_text: undefined` when the field is empty, so a stored object without `intro_text` means "left
   empty"; per-key defaults would bring "Select an action" back after the user cleared it. For
   `features.representation_tooling` / `features.web_fetch` the existing per-key `in` check already separates
   "stored off" (`null`) from "never stored", so the schema default simply replaces the built-in `true` in the
   "never stored" branch.
7. **Dirty tracking:** every value arrives in the initial form values, as the client-config model default does
   today, so nothing is dirty on open.

## Risks / Trade-offs

- **Web fetch changes for new apps.** The schema says `enabled: false`; commit `9913cff` made it `true`. With a
  schema that provides the default, new apps start with it off. Requested explicitly; the specs record it.
- **Add attachment `true` is the inner default** of a feature whose own default is `null` (off in the backend).
  The form follows the schema as asked; the saved value is whatever the user leaves.
- A schema default id may be encoded differently from the loaded deployment ids. Compared as-is; ids in the real
  schema are plain. Revisit if an encoded id shows up.
- One more request on open, after details and in sequence with the summary call.

## Open questions

1. ~~Temperature~~ Resolved: honoured when the schema default is a number in `0`–`1`; `null` (the model's own
   default) has no representation in the number field, so it keeps `0.5`. The system prompt default is an empty
   string, which the form already starts with, so it is not read.
2. ~~Precedence of the schema default over client-config `defaultDeploymentId`~~ Resolved: schema first (confirmed by
   the user). The schema is QuickApp-specific and is how the backend steers new apps (Issue #290); the client-config
   default is chat-wide and stays the next fallback.
