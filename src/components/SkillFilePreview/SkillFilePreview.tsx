import '@epam/ai-dial-attachment-canvas/styles.css';

import {
  AttachmentCanvasBody,
  AttachmentCanvasProvider,
  createForbiddenCanvasContent,
  createLoadErrorCanvasContent,
  useAttachmentCanvas,
  useOpenAttachmentCanvas,
} from '@epam/ai-dial-attachment-canvas';
import { SkillPreviewErrorKind, useSkillFilePreview } from '@epam/ai-dial-chat-hooks/catalog';
import {
  type SkillFileContent,
  skillFileToAttachment,
} from '@epam/ai-dial-chat-hooks/skill-editor';
import { CodeBlockTheme } from '@epam/ai-dial-chat-shared';
import { SkillFileNodeKind } from '@epam/ai-dial-skill-editor';
import { FC, useEffect } from 'react';

import { useThemeContext } from '@/context/ThemeContext';
import { useCatalogDetailsLabels } from '@/hooks/use-catalog-details-labels';
import { SkillFilePreviewState } from '@/types/skill-file-preview';
import { ThemeId } from '@/types/theme';
import { configurePdfWorker } from '@/utils/configure-pdf-worker';
import { loadPdfBlob } from '@/utils/load-pdf-blob';
import { skillFileCanvasResolvers } from '@/utils/skill-file-canvas-resolvers';

export interface SkillFilePreviewProps {
  /** The package file id picked in the catalog file selector. */
  fileId: string;
  /** The tree node's basename: names the region and, without a MIME type, picks the renderer. */
  fileName: string;
  onLoadFile: (fileId: string) => Promise<SkillFileContent>;
}

// A skill file never matches a custom visualizer; none are registered here.
const CANVAS_OPTIONS = { customVisualizers: [] };

const SkillFilePreviewContent: FC<SkillFilePreviewProps> = ({ fileId, fileName, onLoadFile }) => {
  const { canvas: labels } = useCatalogDetailsLabels();
  const { currentTheme } = useThemeContext();
  const { content: canvasContent, attachmentId, isLoading, openCanvas } = useAttachmentCanvas();
  const { openAttachmentCanvas } = useOpenAttachmentCanvas(
    skillFileCanvasResolvers,
    CANVAS_OPTIONS,
  );
  const { content, error } = useSkillFilePreview({ fileId, onLoadFile });

  useEffect(() => {
    if (content == null) return;
    const node = { path: fileId, name: fileName, kind: SkillFileNodeKind.File };
    void openAttachmentCanvas(skillFileToAttachment(node, content), fileId);
  }, [content, fileId, fileName, openAttachmentCanvas]);

  useEffect(() => {
    if (error == null) return;
    if (error === SkillPreviewErrorKind.Forbidden) {
      openCanvas(createForbiddenCanvasContent(), fileName, fileId);
    } else {
      openCanvas(createLoadErrorCanvasContent(), fileName, fileId);
    }
  }, [error, fileName, fileId, openCanvas]);

  const state =
    attachmentId === fileId && !isLoading
      ? SkillFilePreviewState.Ready
      : SkillFilePreviewState.Loading;

  return (
    <div role="group" aria-label={fileName} className="h-full min-h-0 min-w-0 overflow-hidden">
      <AttachmentCanvasBody
        content={canvasContent}
        isLoading={state === SkillFilePreviewState.Loading}
        fileName={fileName}
        labels={labels}
        codeBlockTheme={
          currentTheme?.id === ThemeId.Dark ? CodeBlockTheme.Dark : CodeBlockTheme.Light
        }
        configurePdfWorker={configurePdfWorker}
        loadPdf={loadPdfBlob}
        hidePdfToolbar
      />
    </div>
  );
};

/**
 * One skill package file rendered through the chat's attachment canvas. Each
 * file gets its own canvas provider, so a superseded pick's late result is
 * dropped with its provider and never shows.
 */
export const SkillFilePreview: FC<SkillFilePreviewProps> = (props) => (
  <AttachmentCanvasProvider key={props.fileId}>
    <SkillFilePreviewContent {...props} />
  </AttachmentCanvasProvider>
);
