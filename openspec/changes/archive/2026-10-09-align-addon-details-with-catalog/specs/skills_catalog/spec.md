# Spec Delta

## MODIFIED Requirements

### Requirement: Skill details content

The Details tab SHALL show the skill's description followed by the rendered Markdown body of the skill's `SKILL.md` manifest. The YAML frontmatter SHALL be stripped from the body.

- **Description:** the frontmatter `description`, falling back to the listing `description`.
- **Rendering:** the catalog `ContentTab` from `@epam/ai-dial-catalog`, fed `promptContent` from the catalog pipeline (`catalog-entity-details`). When the package holds more than one file, the tab SHALL show the catalog file selector above the body, opened on `SKILL.md`; choosing another file SHALL load it through the catalog's `onLoadContentFile` (`GET /api/v1/skills/files/download` with that `filePath`) and render it as Markdown, and choosing `SKILL.md` again SHALL show the manifest body without a request. A file that fails to load SHALL show `quickAppEditor` `ContentFileError`.
- **Fetch:** the manifest SHALL be fetched only while the popup is open, through `skillsApi.downloadSkillFileRaw` from `@epam/ai-dial-chat-api-client`, by the catalog's `useSkillItemDetails` (inside `useCatalogItemDetails`).
- **State ownership:** `useEntityDetails` (`src/hooks/use-entity-details.ts`) owns the fetch state. It SHALL ignore a response that arrives after the popup closed or switched skills.

Request: `GET /api/v1/skills/files/download?bucket={bucket}&path={path}&filePath=SKILL.md`. `bucket` and `path` are derived from the skill id `skills/{bucket}/{path}`.

Example, for skill id `skills/public/research/user-research`:

```http
GET /api/v1/skills/files/download?bucket=public&path=research%2Fuser-research&filePath=SKILL.md
```

```text
200 OK
Content-Type: text/markdown

---
name: User Research
description: Plan, conduct, and synthesize user research.
---
# User Research

Help plan, execute, and synthesize user research studies.
```

Rendered result: the description "Plan, conduct, and synthesize user research." above a "User Research" heading and its paragraph.

#### Scenario: Manifest loads

- **WHEN** the details popup opens for a skill whose `SKILL.md` is returned as above
- **THEN** the Details tab SHALL show the description and the rendered heading and paragraph
- **AND** the frontmatter lines SHALL NOT be shown

#### Scenario: Manifest loading

- **WHEN** the manifest request is pending
- **THEN** the Details tab SHALL show the listing description, and the loading indicator with accessible label `quickAppEditor` `LoadingDetails` SHALL be shown next to the tab row

#### Scenario: Manifest fails to load

- **WHEN** the manifest and the file listing both fail
- **THEN** the Details tab SHALL show the listing description, and the `quickAppEditor` `FailedToLoadDetails` message with a **Retry** button (`quickAppEditor` key `Retry`) that repeats the requests
- **AND** the footer actions SHALL remain usable

#### Scenario: Manifest without frontmatter

- **WHEN** `SKILL.md` has no frontmatter block
- **THEN** the whole file SHALL be rendered as the body and the listing description SHALL be shown above it

#### Scenario: Skill unavailable

- **WHEN** the popup opens for an attached skill id that is not in `skillsMap`
- **THEN** no manifest request SHALL be made
- **AND** the Details tab SHALL show `quickAppEditor` `SkillUnavailable` ("This skill is no longer available")
- **AND** Delete SHALL still be offered in an editable application


#### Scenario: Choose another package file

- **WHEN** the skill package holds `SKILL.md` and `reference/guide.md` and the user picks `reference/guide.md` in the file selector
- **THEN** `GET /api/v1/skills/files/download?bucket={bucket}&path={path}&filePath=reference%2Fguide.md` SHALL be requested once
- **AND** its Markdown SHALL replace the manifest body in the Details tab
