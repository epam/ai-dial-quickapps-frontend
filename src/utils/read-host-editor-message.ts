import { AppsEditorMessages, parseAppsEditorHostMessage } from '@epam/ai-dial-visualizer-connector';
import { z } from 'zod';

import { ToolsetAuthStatus, ToolsetAuthType, ToolsetCredentialsLevel } from '@/types/dial-entities';
import { AdminInboundMessageType, type InboundMessage } from '@/types/editor-messages';
import { isOriginAllowed } from '@/utils/allowed-origins';

const generalSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  locales: z
    .array(
      z.object({
        language: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  primaryLocale: z.string().optional(),
  iconUrl: z.string().optional(),
  topics: z.array(z.string()).optional(),
  display_version: z.string().optional(),
});

const toolsetResultSchema = z.object({
  type: z.union([
    z.literal(AppsEditorMessages.ToolsetLoginResult),
    z.literal(AppsEditorMessages.ToolsetLogoutResult),
  ]),
  toolsetId: z.string(),
  success: z.boolean(),
  credentialsLevel: z.enum(ToolsetCredentialsLevel).optional(),
  reason: z.string().optional(),
  credentials: z
    .object({
      authenticationType: z.enum(ToolsetAuthType),
      userStatus: z.enum(ToolsetAuthStatus).optional(),
      globalStatus: z.enum(ToolsetAuthStatus).optional(),
      isPublic: z.boolean().optional(),
      isManageableByAdmin: z.boolean().optional(),
      apiKeyHeader: z.string().optional(),
    })
    .optional(),
});

const adminMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(AdminInboundMessageType.Reset) }),
  z.object({
    type: z.literal(AdminInboundMessageType.TriggerAutoSave),
    payload: z.object({ ignoreDirty: z.boolean().optional() }).optional(),
  }),
]);

/** Validate the parent endpoint, shared envelope, and application-owned domain fields. */
export const readHostEditorMessage = (
  event: MessageEvent<unknown>,
  allowedOrigins?: string[],
): InboundMessage | null => {
  if (event.source !== window.parent || !isOriginAllowed(event.origin, allowedOrigins)) return null;

  const message = parseAppsEditorHostMessage(event.data);
  if (message?.type === AppsEditorMessages.TriggerSave) {
    const general = generalSchema.optional().safeParse(message.general);
    if (!general.success) return null;
    return { type: message.type, general: general.data };
  }
  if (message) {
    const result = toolsetResultSchema.safeParse(message);
    return result.success ? result.data : null;
  }

  const adminMessage = adminMessageSchema.safeParse(event.data);
  return adminMessage.success ? adminMessage.data : null;
};
