// Transient lifecycle states a deployable entity can be in, in priority
// order: the first one that's true wins.
export enum EntityStatusKind {
  Deploying = 'DEPLOYING',
  Undeploying = 'UNDEPLOYING',
  Redeploying = 'REDEPLOYING',
  Undeployed = 'UNDEPLOYED',
}

// How an add-on's status line is styled: `Error` asks the user to act on it.
export enum EntityStatusSeverity {
  Info = 'info',
  Error = 'error',
}

export interface EntityStatusMessage {
  text: string;
  severity: EntityStatusSeverity;
}
