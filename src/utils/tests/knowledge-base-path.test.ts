import { DialItemType } from '@epam/ai-dial-ui-kit';
import { describe, expect, it } from 'vitest';

import { parseKnowledgeBaseItem } from '../knowledge-base-path';

const rootLabels = { personal: 'Personal', organization: 'Organization', shared: 'Shared with me' };

describe('parseKnowledgeBaseItem', () => {
  it('parses a folder in the public bucket', () => {
    expect(parseKnowledgeBaseItem('files/public/user-research-reports/', 'abc', rootLabels)).toEqual({
      type: DialItemType.Folder,
      name: 'user-research-reports',
      segments: ['Organization', 'user-research-reports'],
    });
  });

  it('parses a file in nested folders', () => {
    expect(
      parseKnowledgeBaseItem('files/public/Dial-Design/survey results.pdf', 'abc', rootLabels),
    ).toEqual({
      type: DialItemType.File,
      name: 'survey results.pdf',
      segments: ['Organization', 'Dial-Design', 'survey results.pdf'],
    });
  });

  it('labels the own bucket as Personal and a bucket root as a single folder segment', () => {
    expect(parseKnowledgeBaseItem('files/abc/', 'abc', rootLabels)).toEqual({
      type: DialItemType.Folder,
      name: 'Personal',
      segments: ['Personal'],
    });
  });

  it('labels any other bucket as shared', () => {
    expect(parseKnowledgeBaseItem('files/other/a.txt', 'abc', rootLabels).segments).toEqual([
      'Shared with me',
      'a.txt',
    ]);
  });

  it('decodes percent-encoded segments', () => {
    expect(parseKnowledgeBaseItem('files/abc/My%20Docs/a%20b.pdf', 'abc', rootLabels).segments).toEqual(
      ['Personal', 'My Docs', 'a b.pdf'],
    );
  });

  it('keeps every folder of a deep path', () => {
    expect(parseKnowledgeBaseItem('files/abc/a/b/c/d/e.md', 'abc', rootLabels).segments).toEqual([
      'Personal',
      'a',
      'b',
      'c',
      'd',
      'e.md',
    ]);
  });

  it('falls back to the raw id for a malformed or non-files id', () => {
    expect(parseKnowledgeBaseItem('%E0%A4%A', 'abc', rootLabels).segments).toEqual(['%E0%A4%A']);
    expect(parseKnowledgeBaseItem('something/else.txt', 'abc', rootLabels).segments).toEqual([
      'something/else.txt',
    ]);
  });
});
