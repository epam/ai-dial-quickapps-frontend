# Quick Apps Frontend

Standalone Next.js app that renders the QuickApp2 editor. Designed to be embedded as an `<iframe>` inside `ai-dial-chat` and communicate with the host via `postMessage`.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to use the **dev harness** — it embeds the editor, sends an `INIT` message with mock data, and logs all postMessage traffic. The harness is only available in development; in production `/` redirects to `/editor`.

## Commands

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Type-check and build     |
| `npm run lint`  | Run ESLint               |

## Environment variables

Copy `.env.template` to `.env.local` and adjust values as needed.

| Variable                              | Required | Default                                                                  | Description                                                                                                                                           |
| ------------------------------------- | :------: | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ALLOWED_ORIGIN`          |    No    | `*`                                                                      | Origin allowed to send `postMessage` events to the `/editor` iframe. Set to the exact `ai-dial-chat` URL in production (e.g. `https://chat.example.com`). Using `*` accepts messages from any origin — fine for local dev, **unsafe for production**. |
| `NEXT_PUBLIC_QUICK_APPS_DEFAULT_MODEL`|    No    | `gpt-4o`                                                                 | Model ID pre-selected in the form when no model is stored in the app config.                                                                          |
| `NEXT_PUBLIC_QUICK_APPS_SCHEMA_2_ID`  |    No    | `https://mydial.epam.com/custom_application_schemas/quickapps2`          | `applicationTypeSchemaId` used to identify QuickApp2 applications. Override only if your DIAL instance uses a non-standard schema registry URL.       |

## postMessage protocol

The `/editor` page communicates with its host via `postMessage`. Both sides validate `event.origin` against `NEXT_PUBLIC_ALLOWED_ORIGIN`.

**Host → iframe**

| Message type         | Payload                                              | Description                                  |
| -------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `INIT`               | `{ app, token, dialApiHost, settings }`              | Initialises the editor with app data          |
| `TRIGGER_SAVE`       | —                                                    | Triggers a manual save                        |
| `TRIGGER_AUTO_SAVE`  | `{ ignoreDirty?: boolean }`                          | Triggers an auto-save                         |
| `RESET`              | —                                                    | Resets the form to the last saved state       |

**Iframe → host**

| Message type        | Payload                  | Description                                      |
| ------------------- | ------------------------ | ------------------------------------------------ |
| `READY`             | —                        | Editor mounted; host should send `INIT`           |
| `DIRTY_STATE`       | `{ isDirty: boolean }`   | Form dirty state changed                         |
| `SAVE_SUCCESS`      | `{ updatedApp }`         | Save completed successfully                      |
| `SAVE_ERROR`        | `{ error: string }`      | Save failed                                      |
| `AUTO_SAVE_COMPLETE`| —                        | Auto-save completed successfully                 |
| `HEIGHT_CHANGE`     | `{ height: number }`     | Editor height changed (for iframe resize)        |
