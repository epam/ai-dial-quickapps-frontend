/** Presentation state of a skill package file preview in the details popup. */
export enum SkillFilePreviewState {
  /** The picked file is downloading, or the canvas is still preparing it. */
  Loading = 'loading',
  /** The canvas holds the picked file's content (or its error content). */
  Ready = 'ready',
}
