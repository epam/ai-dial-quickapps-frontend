# Docker Runtime Image Specification

## Purpose

This capability defines the container image used to serve the QuickApps static build in
runtime and local Docker smoke tests. QuickApps is built as a static SPA and served by the
published `ai-dial-chat-bff` NestJS BFF image; the Docker image is not a standalone frontend
server.

## Requirements

### Requirement: Runtime image selection

The deployable QuickApps image SHALL use the published
`ghcr.io/epam/ai-dial-chat-bff` image as its runtime base rather than the former
`ghcr.io/epam/ai-dial-chat` image.

#### Scenario: Default Docker build

- **WHEN** an operator builds the repository's root `Dockerfile` without overriding
  `CHAT_API_IMAGE`
- **THEN** the builder SHALL use `ghcr.io/epam/ai-dial-chat-bff:development` as the runtime
  base image

#### Scenario: Explicit Docker image override

- **WHEN** an operator supplies a `CHAT_API_IMAGE` build argument
- **THEN** the Dockerfile SHALL use the supplied image and tag as its runtime base

### Requirement: Frontend assets layered into the BFF

The runtime image SHALL contain the QuickApps production build at the chat-api static frontend
location and SHALL start the BFF server rather than a separate frontend server.

#### Scenario: Runtime image starts

- **WHEN** the built image starts with valid chat-api runtime configuration
- **THEN** it SHALL serve the copied QuickApps assets through chat-api's server
- **AND** it SHALL expose the configured chat-api port

### Requirement: Local Docker runner image consistency

The local Docker runner SHALL use the same renamed `ai-dial-chat-bff` image family by default as
the root Dockerfile.

#### Scenario: Default local Docker run

- **WHEN** an operator runs `npm run docker:run` without setting `CHAT_API_IMAGE`
- **THEN** `scripts/docker-run-dist.mjs` SHALL pull and run
  `ghcr.io/epam/ai-dial-chat-bff:development`
- **AND** it SHALL mount the freshly built `dist/` directory into the BFF's static frontend
  location

#### Scenario: Local Docker image override

- **WHEN** an operator sets `CHAT_API_IMAGE` before running `npm run docker:run`
- **THEN** the runner SHALL pull and run the supplied image instead of its default

### Requirement: Documentation consistency

Current Docker documentation SHALL identify `ai-dial-chat-bff` as the runtime image and SHALL
not direct operators to use the former image name for current builds or local Docker runs.
Historical transition documentation MAY retain the former image name when describing the original
architecture migration.

#### Scenario: Current Docker documentation names the runtime image

- **WHEN** an operator follows the current Docker build or local-run instructions
- **THEN** the documentation SHALL identify `ai-dial-chat-bff` as the runtime image
- **AND** it SHALL not direct the operator to use the former `ai-dial-chat` image name
- **AND** historical transition documentation MAY retain the former name

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
