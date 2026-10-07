import { describe, expect, it } from 'vitest';

import { parseSkillManifest } from '@/utils/parse-skill-manifest';

describe('parseSkillManifest', () => {
  it('strips the frontmatter and reads a plain description', () => {
    const manifest = parseSkillManifest(
      [
        '---',
        'name: User Research',
        'description: Plan, conduct, and synthesize user research.',
        '---',
        '# User Research',
        '',
        'Help plan, execute, and synthesize user research studies.',
      ].join('\n'),
    );

    expect(manifest).toEqual({
      description: 'Plan, conduct, and synthesize user research.',
      body: '# User Research\n\nHelp plan, execute, and synthesize user research studies.',
    });
  });

  it('reads quoted descriptions', () => {
    expect(parseSkillManifest('---\ndescription: "Say \\"hi\\": now"\n---\nBody').description).toBe(
      'Say "hi": now',
    );
    expect(parseSkillManifest("---\ndescription: 'It''s fine'\n---\nBody").description).toBe(
      "It's fine",
    );
  });

  it('folds a > block and keeps line breaks of a | block', () => {
    const folded = parseSkillManifest(
      ['---', 'description: >', '  Plan and', '  conduct research.', 'name: x', '---', 'Body'].join(
        '\n',
      ),
    );
    const literal = parseSkillManifest(
      ['---', 'description: |-', '  Line one', '  Line two', '---', 'Body'].join('\n'),
    );

    expect(folded.description).toBe('Plan and conduct research.');
    expect(literal.description).toBe('Line one\nLine two');
  });

  it('joins indented continuation lines of a plain description', () => {
    expect(
      parseSkillManifest('---\ndescription: Plan, conduct,\n  and synthesize.\n---\nBody')
        .description,
    ).toBe('Plan, conduct, and synthesize.');
  });

  it('handles CRLF line endings and a byte order mark', () => {
    const byteOrderMark = String.fromCharCode(0xfeff);

    expect(parseSkillManifest(`${byteOrderMark}---\r\ndescription: Hi\r\n---\r\nBody`)).toEqual({
      description: 'Hi',
      body: 'Body',
    });
  });

  it('returns the whole text as the body without frontmatter', () => {
    expect(parseSkillManifest('# Title\n\nText')).toEqual({ body: '# Title\n\nText' });
  });

  it('returns unterminated frontmatter verbatim', () => {
    const text = '---\ndescription: Hi\n# Title';

    expect(parseSkillManifest(text)).toEqual({ body: text });
  });

  it('leaves the description undefined when the frontmatter has none', () => {
    expect(parseSkillManifest('---\nname: x\n---\nBody')).toEqual({
      description: undefined,
      body: 'Body',
    });
  });
});
