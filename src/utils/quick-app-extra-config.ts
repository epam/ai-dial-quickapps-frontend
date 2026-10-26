import cloneDeep from 'lodash-es/cloneDeep';
import get from 'lodash-es/get';
import isEmpty from 'lodash-es/isEmpty';
import isPlainObject from 'lodash-es/isPlainObject';
import unset from 'lodash-es/unset';

import { decodeApiUrl } from '@/utils/api';
import { ContextType, SkillRefType } from '@/types/quick-apps';

export type QuickAppExtraConfig = Record<string, unknown>;

// Leaves of the saved config that the editor form writes itself. Everything else the
// loaded config holds is an "extra": it is kept as loaded, shown in the Edit JSON popup and
// written back on save. `orchestrator.attachment_strategy` is not listed: it stays an extra
// and is overridden only for a model that accepts attachments. `contexts` and `skills` stay
// whole too; their items are matched by url when the config is composed.
const FORM_OWNED_PATHS = [
  'tool_sets',
  'input_attachment_types',
  'max_input_attachments',
  'orchestrator.deployment.deployment_id',
  'orchestrator.deployment.parameters.temperature',
  'orchestrator.system_prompt.content',
  'orchestrator.system_prompt.type',
  'conversation_starters.intro_text',
  'conversation_starters.chat_message_input_disabled',
  'conversation_starters.auto_submit',
  'conversation_starters.starters',
  'features.timestamp',
  'features.dial_files',
  'features.representation_tooling',
  'features.web_fetch',
];

// Parents that are dropped when removing form-owned leaves leaves them empty.
const PRUNABLE_PATHS = [
  'orchestrator.deployment.parameters',
  'orchestrator.deployment',
  'orchestrator.system_prompt',
  'orchestrator',
  'conversation_starters',
  'features',
];

export const isOwnedContext = (context: unknown): context is { url: string; type?: string } =>
  isPlainObject(context) &&
  typeof (context as { url?: unknown }).url === 'string' &&
  [undefined, ContextType.File].includes((context as { type?: ContextType }).type);

export const isOwnedSkill = (skill: unknown): skill is { type: SkillRefType; url: string } =>
  isPlainObject(skill) &&
  (skill as { type?: unknown }).type === SkillRefType.DialSkill &&
  typeof (skill as { url?: unknown }).url === 'string';

/** Splits the stored config: returns it without the leaves the editor form owns. */
export const getQuickApp2ExtraConfig = (config?: object | null): QuickAppExtraConfig => {
  const extra = cloneDeep(isPlainObject(config) ? (config as QuickAppExtraConfig) : {});
  FORM_OWNED_PATHS.forEach((path) => unset(extra, path));
  PRUNABLE_PATHS.forEach((path) => {
    const value = get(extra, path);
    if (isPlainObject(value) && isEmpty(value)) unset(extra, path);
  });
  // `conversation_starters: null` and other non-objects carry nothing.
  if (!isPlainObject(extra.conversation_starters)) delete extra.conversation_starters;
  return extra;
};

export const findExtraContext = (extra: QuickAppExtraConfig, url: string): object =>
  (Array.isArray(extra.contexts) ? extra.contexts : []).find(
    (context) => isOwnedContext(context) && context.url === url,
  ) ?? {};

export const findExtraSkill = (extra: QuickAppExtraConfig, url: string): object =>
  (Array.isArray(extra.skills) ? extra.skills : []).find(
    (skill) => isOwnedSkill(skill) && decodeApiUrl(skill.url) === url,
  ) ?? {};
