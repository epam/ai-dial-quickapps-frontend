import type { SkillManifest } from '@/types/skill-manifest';

const FRONTMATTER_DELIMITER = '---';
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);
const DESCRIPTION_KEY_PATTERN = /^description:\s*(.*)$/;
const BLOCK_SCALAR_PATTERN = /^([>|])[+-]?$/;

const isIndented = (line: string): boolean => /^\s+\S/.test(line);

const unquote = (value: string): string => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
};

/** Lines that belong to the value: indented ones, plus blank lines between them. */
const collectContinuation = (lines: string[], start: number): string[] => {
  const collected: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() !== '' && !isIndented(line)) break;
    collected.push(line.trim());
  }
  while (collected.length > 0 && collected[collected.length - 1] === '') collected.pop();
  return collected;
};

/** `>` folds lines into one paragraph (blank lines become line breaks); `|` keeps them. */
const foldLines = (lines: string[], isLiteral: boolean): string => {
  if (isLiteral) return lines.join('\n');
  return lines
    .join('\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' '))
    .join('\n');
};

/**
 * Reads only the `description` key — the editor needs nothing else from the
 * frontmatter, so a full YAML parser would be dead weight.
 */
const readDescription = (frontmatterLines: string[]): string | undefined => {
  const index = frontmatterLines.findIndex((line) => DESCRIPTION_KEY_PATTERN.test(line));
  if (index === -1) return undefined;

  const rawValue = frontmatterLines[index].match(DESCRIPTION_KEY_PATTERN)?.[1]?.trim() ?? '';
  const continuation = collectContinuation(frontmatterLines, index + 1);
  const blockScalar = rawValue.match(BLOCK_SCALAR_PATTERN);

  let description: string;
  if (blockScalar) {
    description = foldLines(continuation, blockScalar[1] === '|');
  } else if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
    description = unquote(rawValue);
  } else {
    description = foldLines([rawValue, ...continuation], false);
  }

  const trimmed = description.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * Splits a skill's `SKILL.md` into its frontmatter `description` and Markdown
 * body. A manifest without a frontmatter block — or with one that is never
 * closed — is returned whole as the body.
 */
export const parseSkillManifest = (text: string): SkillManifest => {
  const normalized = text.replace(/\r\n?/g, '\n');
  const content = normalized.startsWith(BYTE_ORDER_MARK) ? normalized.slice(1) : normalized;
  const lines = content.split('\n');

  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) return { body: text };

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER,
  );
  if (closingIndex === -1) return { body: text };

  return {
    description: readDescription(lines.slice(1, closingIndex)),
    body: lines
      .slice(closingIndex + 1)
      .join('\n')
      .replace(/^\n+/, ''),
  };
};
