// Transient lifecycle states a deployable entity can be in, in priority
// order: the first one that's true wins.
export enum EntityStatusKind {
  Deploying = 'DEPLOYING',
  Undeploying = 'UNDEPLOYING',
  Redeploying = 'REDEPLOYING',
  Undeployed = 'UNDEPLOYED',
}
