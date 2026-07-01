1. Model selection - there should be popup on click, and it should have content as before. Now it shows dropdown.
2. context and tools - popup should be as in old app (but use ui kit). And there is no logic that the tool can need to be configured, and it's shown on the card, and then in input and there should be popup for configuration. All this logic is missing and it was present in old version.
3. context files - when popup opens, the list is always empty and request fails with 404.
4. agent skills - when popup opens, the list is always empty and request fails with 404. The buttons in the popup are different from what we had in old version.

Input from other agent investigation:
Here is a thorough summary of the current state of every file you asked about.

Summary of What Needs Work

┌──────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ Item │ Status │
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ FilesSelector "Add" button │ Stub — no modal wired, passes emptyarray │
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ DataContext file loading │ FILES_LOADED never dispatched,fetchDialFiles │
│ │ doesn't exist │
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ AgentSkillsSelector "Add" button │ Hardcoded disabled, no picker wired │
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ AgentSkillsSelector display names │ Shows raw URLs, no name resolution │
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ ModelField click-outside close │ Missing useClickOutside or equivalent │
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ inputAttachmentTypes / maxInputAttachments │ Not deserialized from saved config │
│ hydration │ │
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ DialAppConfigurationModal backdrop/Escape │ Not implemented │
│ dismiss │ │
└──────────────────────────────────────────────┴───────────────────────────────────────────────┘
