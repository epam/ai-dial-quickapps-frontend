import {
  type AttachmentCanvasBodyProps,
  getOoxmlFileType,
  OoxmlFileType,
} from '@epam/ai-dial-attachment-canvas';
import type { SkillFileContent } from '@epam/ai-dial-chat-hooks/skill-editor';
import { CodeBlockTheme } from '@epam/ai-dial-chat-shared';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { ThemeId } from '@/types/theme';

import { SkillFilePreview } from '../SkillFilePreview';

interface OpenedAttachment {
  id: string;
  name: string;
  contentType: string;
}

const mocks = vi.hoisted(() => ({
  preview: { content: null, error: null, isLoading: true } as {
    content: unknown;
    error: string | null;
    isLoading: boolean;
  },
  opened: [] as OpenedAttachment[],
  // When set, an open waits for it before filling the canvas.
  pendingOpen: null as Promise<void> | null,
  bodyProps: null as AttachmentCanvasBodyProps | null,
  theme: { currentTheme: { id: 'light' } as { id: string } | undefined },
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/context/ThemeContext', () => ({ useThemeContext: () => mocks.theme }));
vi.mock('@epam/ai-dial-chat-hooks/catalog', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSkillFilePreview: () => mocks.preview,
}));
vi.mock('@epam/ai-dial-attachment-canvas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@epam/ai-dial-attachment-canvas')>();
  const { useCallback } = await import('react');
  return {
    ...actual,
    // The real canvas resolves through pdf.js / OOXML, which jsdom cannot run:
    // this records the attachment and fills the canvas with its name as text.
    // Stable per provider, like the real hook, so the open effect runs once.
    useOpenAttachmentCanvas: () => {
      const { openCanvas } = actual.useAttachmentCanvas();
      const openAttachmentCanvas = useCallback(
        async (attachment: OpenedAttachment, id: string) => {
          mocks.opened.push(attachment);
          if (mocks.pendingOpen != null) await mocks.pendingOpen;
          openCanvas(
            { type: 'text', text: `content of ${attachment.name}` } as never,
            attachment.name,
            id,
          );
        },
        [openCanvas],
      );
      return { openAttachmentCanvas };
    },
    AttachmentCanvasBody: (props: AttachmentCanvasBodyProps) => {
      mocks.bodyProps = props;
      const content = props.content as { text?: string; errorType?: string } | null;
      return (
        <output aria-busy={props.isLoading}>
          {props.isLoading ? 'loading' : (content?.text ?? content?.errorType ?? '')}
        </output>
      );
    },
  };
});

const bytes = (text: string): SkillFileContent => ({ bytes: new TextEncoder().encode(text) });

let root: Root;
let container: HTMLDivElement;

const render = async (fileId: string, fileName: string) => {
  await act(async () => {
    root.render(<SkillFilePreview fileId={fileId} fileName={fileName} onLoadFile={vi.fn()} />);
  });
};

const region = () => container.querySelector('[role="group"]') as HTMLElement;
const body = () => container.querySelector('output') as HTMLElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.preview = { content: null, error: null, isLoading: true };
  mocks.opened = [];
  mocks.pendingOpen = null;
  mocks.bodyProps = null;
  mocks.theme.currentTheme = { id: ThemeId.Light };
  document.documentElement.dir = 'ltr';
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('SkillFilePreview', () => {
  it('shows the loading state while the file downloads', async () => {
    await render('data/people.csv', 'people.csv');

    expect(body().getAttribute('aria-busy')).toBe('true');
    expect(mocks.opened).toEqual([]);
  });

  it('opens a downloaded file in the canvas with its name and MIME type', async () => {
    mocks.preview = {
      content: { ...bytes('a,b'), mimeType: 'text/csv' },
      error: null,
      isLoading: false,
    };

    await render('data/people.csv', 'people.csv');

    expect(mocks.opened).toEqual([
      expect.objectContaining({
        id: 'data/people.csv',
        name: 'people.csv',
        contentType: 'text/csv',
      }),
    ]);
    expect(body().textContent).toBe('content of people.csv');
    expect(body().getAttribute('aria-busy')).toBe('false');
  });

  it('leaves a file without a MIME type to be typed by its extension', async () => {
    mocks.preview = { content: bytes('PK'), error: null, isLoading: false };

    await render('docs/report.docx', 'report.docx');

    const [attachment] = mocks.opened;
    expect(attachment?.name).toBe('report.docx');
    // The canvas picks its Office renderer from the name when no type is given.
    expect(getOoxmlFileType(attachment.name, attachment.contentType || undefined)).toBe(
      OoxmlFileType.Docx,
    );
  });

  it('shows the forbidden content for a 403', async () => {
    mocks.preview = { content: null, error: 'forbidden', isLoading: false };

    await render('secret.pdf', 'secret.pdf');

    expect(body().textContent).toBe('forbidden');
    expect(mocks.opened).toEqual([]);
  });

  it('shows the load-error content for any other failure', async () => {
    mocks.preview = { content: null, error: 'generic', isLoading: false };

    await render('guide.pdf', 'guide.pdf');

    expect(body().textContent).toBe('load_failed');
  });

  it('is a group named by the file name', async () => {
    await render('guide.pdf', 'guide.pdf');

    expect(region().getAttribute('aria-label')).toBe('guide.pdf');
  });

  it('labels the canvas with the app translations and hides the PDF toolbar', async () => {
    await render('guide.pdf', 'guide.pdf');

    expect(mocks.bodyProps?.labels).toMatchObject({
      unsupportedLabel: QuickAppEditorI18nKeys.ContentFileUnsupported,
      loadErrorLabel: QuickAppEditorI18nKeys.ContentFileError,
      forbiddenErrorLabel: QuickAppEditorI18nKeys.ContentFileForbidden,
      pdfShowThumbnailsLabel: QuickAppEditorI18nKeys.PdfShowThumbnails,
      xlsxFormulaLabel: QuickAppEditorI18nKeys.SpreadsheetFormula,
      tableDownloadCsvLabel: QuickAppEditorI18nKeys.TableDownloadCsv,
      codeBlockCopyLabel: QuickAppEditorI18nKeys.MarkdownCopyCode,
    });
    expect(Object.values(mocks.bodyProps?.labels ?? {}).every(Boolean)).toBe(true);
    expect(mocks.bodyProps?.hidePdfToolbar).toBe(true);
  });

  it('follows the dark theme for code blocks', async () => {
    mocks.theme.currentTheme = { id: ThemeId.Dark };

    await render('run.py', 'run.py');

    expect(mocks.bodyProps?.codeBlockTheme).toBe(CodeBlockTheme.Dark);
  });

  it('drops the late result of a file that is no longer picked', async () => {
    let finishFirst: () => void = () => undefined;
    mocks.pendingOpen = new Promise<void>((resolve) => (finishFirst = resolve));
    mocks.preview = { content: bytes('first'), error: null, isLoading: false };
    await render('a.md', 'a.md');

    mocks.pendingOpen = null;
    mocks.preview = { content: bytes('second'), error: null, isLoading: false };
    await render('b.md', 'b.md');
    await act(async () => finishFirst());

    expect(body().textContent).toBe('content of b.md');
    expect(region().getAttribute('aria-label')).toBe('b.md');
  });

  it('fills its container without direction-specific classes in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    mocks.preview = { content: bytes('x'), error: null, isLoading: false };

    await render('a.md', 'a.md');

    expect(region().className).toContain('h-full');
    expect(region().className).not.toMatch(/\b(ml|mr|pl|pr|left|right|text-left|text-right)-/);
  });
});
