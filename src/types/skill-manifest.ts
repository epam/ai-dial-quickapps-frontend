export enum ManifestStatus {
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

export interface SkillManifest {
  /** Frontmatter `description`, when the manifest has one. */
  description?: string;
  /** Markdown body with the frontmatter block removed. */
  body: string;
}
