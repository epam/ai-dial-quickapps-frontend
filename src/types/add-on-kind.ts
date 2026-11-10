/** Which Add-ons row an `addOns` entry belongs to. */
export enum AddOnKind {
  Toolset = 'toolset',
  Agent = 'agent',
}

/** How an `addOns` entry relates to the catalog. */
export enum AddOnResolution {
  /** The entity is in the catalog. */
  Catalog = 'catalog',
  /** No entity and no catalog id: a toolset defined in the application's own JSON. */
  Inline = 'inline',
  /** A catalog id (`toolsets/…`, `applications/…`) that is not listed: deleted or hidden. */
  NotFound = 'not-found',
}
