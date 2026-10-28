import isPlainObject from 'lodash-es/isPlainObject';

import type { ApplicationSchemaDefaults } from '@/types/dial-entities';

type SchemaNode = Record<string, unknown>;

const MAX_REF_DEPTH = 16;
const LOCAL_REF_PREFIX = '#/';

const isSchemaNode = (value: unknown): value is SchemaNode => isPlainObject(value);

const isNullBranch = (node: unknown): boolean => isSchemaNode(node) && node.type === 'null';

// A JSON Pointer into the same document; `~1` and `~0` are its escapes for `/` and `~`.
const getRefTarget = (root: SchemaNode, ref: string): unknown => {
  if (!ref.startsWith(LOCAL_REF_PREFIX)) return undefined;
  let target: unknown = root;
  for (const segment of ref.slice(LOCAL_REF_PREFIX.length).split('/')) {
    if (!isSchemaNode(target)) return undefined;
    try {
      target = target[decodeURIComponent(segment).replace(/~1/g, '/').replace(/~0/g, '~')];
    } catch {
      return undefined;
    }
  }
  return target;
};

/**
 * Reads a schema node the standard JSON Schema way: a local `$ref` is followed and the keywords
 * written next to it (`default` included) override the target's, and an optional object
 * (`anyOf` / `oneOf` with a single non-null branch) is read as that branch. A missing or circular
 * reference yields an empty node.
 */
const resolveNode = (root: SchemaNode, node: unknown, depth = 0): SchemaNode => {
  if (!isSchemaNode(node) || depth > MAX_REF_DEPTH) return {};

  const { $ref, anyOf, oneOf, ...siblings } = node;

  if (typeof $ref === 'string') {
    return { ...resolveNode(root, getRefTarget(root, $ref), depth + 1), ...siblings };
  }

  const branches = [anyOf, oneOf].find(Array.isArray) as unknown[] | undefined;
  const objectBranches = branches?.filter((branch) => !isNullBranch(branch));
  if (objectBranches?.length === 1) {
    return { ...resolveNode(root, objectBranches[0], depth + 1), ...siblings };
  }

  return node;
};

const getProperty = (root: SchemaNode, node: SchemaNode, key: string): SchemaNode => {
  const properties = node.properties;
  return isSchemaNode(properties) ? resolveNode(root, properties[key]) : {};
};

const getString = (node: SchemaNode): string | undefined =>
  typeof node.default === 'string' ? node.default : undefined;

const getBoolean = (node: SchemaNode): boolean | undefined =>
  typeof node.default === 'boolean' ? node.default : undefined;

const getDeploymentId = (node: SchemaNode): string | undefined => {
  const { default: value } = node;
  const deploymentId = isSchemaNode(value) ? value.deployment_id : undefined;
  return typeof deploymentId === 'string' && deploymentId ? deploymentId : undefined;
};

/** Drops keys without a value, so an empty group does not look like a provided default. */
const compact = <T extends object>(value: T): T | undefined => {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
};

/** Reads the defaults the form edits from an application type schema. */
export const getApplicationSchemaDefaults = (schema?: unknown): ApplicationSchemaDefaults => {
  if (!isSchemaNode(schema)) return {};

  const root = schema;
  const rootNode = resolveNode(root, root);
  const orchestrator = getProperty(root, rootNode, 'orchestrator');
  const starters = getProperty(root, rootNode, 'conversation_starters');
  const features = getProperty(root, rootNode, 'features');
  const representationTooling = getProperty(root, features, 'representation_tooling');
  const webFetch = getProperty(root, features, 'web_fetch');

  const defaults: ApplicationSchemaDefaults = {
    deploymentId: getDeploymentId(getProperty(root, orchestrator, 'deployment')),
    conversationStarters: compact({
      introText: getString(getProperty(root, starters, 'intro_text')),
      autoSubmit: getBoolean(getProperty(root, starters, 'auto_submit')),
      chatMessageInputDisabled: getBoolean(
        getProperty(root, starters, 'chat_message_input_disabled'),
      ),
    }),
    addAttachment: getBoolean(getProperty(root, representationTooling, 'add_attachment')),
    webFetch: getBoolean(getProperty(root, webFetch, 'enabled')),
  };

  return compact(defaults) ?? {};
};
