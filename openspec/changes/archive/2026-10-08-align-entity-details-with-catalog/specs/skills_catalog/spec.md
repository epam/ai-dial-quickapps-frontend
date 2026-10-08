## MODIFIED Requirements

### Requirement: Skill overview

The Overview tab SHALL be the catalog's `OverviewTab`, with the sections the catalog's `buildSkillOverview` produces, as defined by `catalog-entity-details`:

- **Specification** (`quickAppEditor` `SkillSpecificationSection`), from the `SKILL.md` frontmatter (parsed by the catalog's manifest parser):
  - **When to use** (`SkillWhenToUse`);
  - **Allowed tools** (`SkillAllowedTools`), joined with " · ";
  - **Bundled resources** (`SkillBundledResources`), joined with " · ";
  - the section is omitted when none of them is present.
- **Details** (`quickAppEditor` `SkillDetailsSection`):
  - **Author** (`SkillAuthor`), when known;
  - **Updated** (`SkillUpdated`), as the catalog's calendar date;
  - **Files** (`SkillFileCount`): the number of files in the skill package.

The Overview data SHALL come from three requests, made in parallel when the popup opens (as the chat catalog does), together with the manifest download from "Skill details content":

- `skillsApi.getSkillMetadata({ bucket, path })` → `GET /api/v1/skills/metadata?bucket={bucket}&path={path}`. This is the authoritative author and timestamps; the listing entry is the fallback when it fails.
- `skillsApi.listSkillFiles({ bucket, path, filePath: '', recursive: true })` → `GET /api/v1/skills/files?bucket={bucket}&path={path}&filePath=&recursive=true`.

The Overview tab SHALL be shown only when the file listing succeeds. The folder is shown in the popup header, as for toolsets and agents. The version is no longer an Overview row; it shows next to the name in the header when known.

Example, for skill `skills/public/research/user-research` whose frontmatter has `when_to_use: Planning interviews` and whose package has `SKILL.md` and `guide.md`:

```http
GET /api/v1/skills/files?bucket=public&path=research%2Fuser-research&filePath=&recursive=true
```

```json
{ "items": [
  { "name": "SKILL.md", "url": "skills/public/research/user-research/SKILL.md", "nodeType": "ITEM" },
  { "name": "guide.md", "url": "skills/public/research/user-research/guide.md", "nodeType": "ITEM" }
] }
```

Rendered result:

- Specification: When to use "Planning interviews".
- Details: Author, Updated and Files "2".

#### Scenario: Overview content

- **WHEN** the user selects Overview for a skill with author "jane.doe", `when_to_use` in its frontmatter and two package files
- **THEN** the tab SHALL show a Specification section with When to use, and a Details section with Author "jane.doe", Updated and Files "2"
- **AND** no Folder or Version row SHALL be shown in the tab

#### Scenario: File listing fails

- **WHEN** the file listing request fails
- **THEN** no Overview tab SHALL be shown, and Details (the manifest) SHALL still be shown

#### Scenario: Metadata request fails

- **WHEN** the metadata request fails
- **THEN** the Details section SHALL use the author and updated date from the catalog listing
