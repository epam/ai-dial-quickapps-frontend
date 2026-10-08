/**
 * Resolves the `agentSkills` value confirmed in the Add skill popup. Attached
 * skills that stay checked keep their order, newly checked ones follow in the
 * order they were checked, and attached ids missing from the catalog listing
 * (`listedIds`) are kept in place — they had no row to uncheck.
 */
export const applySkillSelection = (
  attachedIds: readonly string[],
  checkedIds: ReadonlySet<string>,
  listedIds: ReadonlySet<string>,
): string[] => {
  const attachedSet = new Set(attachedIds);
  const kept = attachedIds.filter((id) => checkedIds.has(id) || !listedIds.has(id));
  const added = [...checkedIds].filter((id) => !attachedSet.has(id));
  return [...kept, ...added];
};
