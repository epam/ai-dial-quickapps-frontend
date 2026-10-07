## REMOVED Requirements

### Requirement: Temperature control
**Reason**: The Temperature slider moves out of the Configuration area into the Advanced Settings popup, per the Advanced Settings design.
**Migration**: Now specified by `application_advanced-settings` → "Temperature in the popup". The `temperature` form field, range, default, visibility rule and save serialization are unchanged. Inline edits are replaced by draft-and-Save in the popup.

### Requirement: Process files control
**Reason**: The process-files switch moves out of the Configuration area into the Advanced Settings popup, per the Advanced Settings design.
**Migration**: Now specified by `application_advanced-settings` → "Allow orchestrator to process files in the popup". The `processLargeFiles` form field, visibility rule and `orchestrator.attachment_strategy` serialization are unchanged. Inline edits are replaced by draft-and-Save in the popup.
