# Spec Delta

## ADDED Requirements

### Requirement: Deployment BFF defaults to port 5000
The deployable QuickApps container SHALL use port `5000` as its default BFF listener and SHALL expose the health endpoint on that listener unless an operator supplies an explicit runtime `PORT` override.

#### Scenario: Default deployable image startup
- **WHEN** an operator starts the root Docker image without overriding `PORT`
- **THEN** the BFF SHALL listen on container port `5000`
- **AND** the image metadata SHALL expose port `5000`
- **AND** the health check SHALL probe the BFF health endpoint on port `5000`

#### Scenario: Deployment listener override
- **WHEN** a deployment supplies an explicit `PORT` value
- **THEN** the BFF SHALL listen on that configured port
- **AND** the health check SHALL probe the configured port rather than assuming `5000`

### Requirement: Local frontend workflows use the isolated BFF port
The repository's local frontend workflows SHALL direct QuickApps API traffic to a BFF on port `5001`, keeping local QuickApps separate from a sibling chat-api instance that uses port `5000`.

#### Scenario: Vite development workflow
- **WHEN** an operator runs the Vite development server and a local QuickApps BFF
- **THEN** `/api/*` requests from the Vite server SHALL be proxied to `http://localhost:5001`
- **AND** the local BFF process SHALL listen on port `5001`

#### Scenario: Local Docker smoke workflow
- **WHEN** an operator runs `npm run docker:run`
- **THEN** the runner SHALL publish host port `5001` to container port `5001`
- **AND** the runner SHALL configure the BFF with `PORT=5001` regardless of the port in its env file

### Requirement: Port defaults are documented by execution environment
The repository's runtime configuration documentation SHALL identify `5000` as the deployable image default and `5001` as the explicit local workflow port, including the command or override needed for each workflow.

#### Scenario: Operator prepares deployment configuration
- **WHEN** an operator copies the repository's runtime environment template for a deployment
- **THEN** the documented `PORT` default SHALL be `5000`
- **AND** the deployment example SHALL publish and use port `5000`

#### Scenario: Operator prepares local configuration
- **WHEN** an operator follows the local Vite, local checkout, or local Docker instructions
- **THEN** the instructions SHALL identify port `5001` for the QuickApps BFF
- **AND** they SHALL distinguish that local override from the deployment default
