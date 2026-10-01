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
