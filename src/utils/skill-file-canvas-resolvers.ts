import type { UseOpenAttachmentCanvasResolvers } from '@epam/ai-dial-attachment-canvas';
import {
  type AttachmentCanvasUrlResolvers,
  hasAttachmentTextSource,
  resolveCodeCanvasContent,
  resolveHtmlCanvasContent,
  resolveImageCanvasContent,
  resolveJsonCanvasContent,
  resolveMarkdownCanvasContent,
  resolveOoxmlCanvasContent,
  resolvePdfCanvasContent,
  resolveTextCanvasContent,
  resolveVisualizerCanvasContent,
} from '@epam/ai-dial-chat-hooks/file-manager-canvas';

/** chat-api's bootstrap document that renders inline HTML under its own CSP, as in the chat app. */
export const HTML_PREVIEW_FRAME_URL = '/api/v1/files/html-preview-frame';

/*
 * A skill package file reaches the canvas as in-memory bytes (`attachment.file`),
 * never as a DIAL file id, so there is no DIAL-file URL to resolve.
 */
const urlResolvers: AttachmentCanvasUrlResolvers = {
  resolveDialFileDownloadUrl: () => undefined,
  resolveDialUrl: () => undefined,
  resolveDialFileMetadataUrl: () => undefined,
  htmlSrcdocHostUrl: HTML_PREVIEW_FRAME_URL,
};

/**
 * The attachment-canvas content resolvers for skill package files: the chat
 * app's shared resolvers, over in-memory files only. Built once, since none
 * of it depends on render state.
 */
export const skillFileCanvasResolvers: UseOpenAttachmentCanvasResolvers = {
  resolveImageContent: (attachment) => resolveImageCanvasContent(attachment, urlResolvers),
  resolveTextContent: (attachment) => resolveTextCanvasContent(attachment, urlResolvers),
  resolveMarkdownContent: (attachment) => resolveMarkdownCanvasContent(attachment, urlResolvers),
  resolveCodeContent: (attachment, language) =>
    resolveCodeCanvasContent(attachment, urlResolvers, language),
  resolveHtmlContent: (attachment) => resolveHtmlCanvasContent(attachment, urlResolvers),
  resolvePdfContent: (attachment) => resolvePdfCanvasContent(attachment, urlResolvers),
  resolveOoxmlContent: (attachment, format) =>
    resolveOoxmlCanvasContent(attachment, urlResolvers, format),
  resolveJsonContent: (attachment) => resolveJsonCanvasContent(attachment, urlResolvers),
  resolveVisualizerContent: (attachment, visualizer, themeId) =>
    resolveVisualizerCanvasContent(attachment, urlResolvers, visualizer, themeId ?? ''),
  // Only called for an attachment with a `referenceUrl`, which a skill file never has.
  resolveReferencePdfContent: () => null,
  resolveContentUrl: () => undefined,
  hasTextSource: (attachment) => hasAttachmentTextSource(attachment, urlResolvers),
};
