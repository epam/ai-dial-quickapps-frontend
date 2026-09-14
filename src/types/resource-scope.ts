export enum ResourceScope {
  Personal = 'personal',
  Shared = 'shared',
  Organization = 'organization',
}

export interface EntityScopeInfo {
  scope: ResourceScope;
  /** Decoded folder segments between the bucket and the entity name; empty for bucket-root entities. */
  folderPath: string[];
}
