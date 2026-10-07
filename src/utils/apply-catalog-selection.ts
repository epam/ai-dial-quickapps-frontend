/**
 * Resolves the id list confirmed in a catalog picker (Add skill, Add toolset,
 * Add agent). Attached ids that stay checked keep their order, newly checked
 * ones follow in the order they were checked, and attached ids with no row in
 * the picker (`listedIds`) are kept in place — they had no row to uncheck.
 * The last rule is what keeps another row's ids untouched when a picker edits
 * a shared list such as `addOns`.
 */
export const applyCatalogSelection = (
  attachedIds: readonly string[],
  checkedIds: ReadonlySet<string>,
  listedIds: ReadonlySet<string>,
): string[] => {
  const attachedSet = new Set(attachedIds);
  const kept = attachedIds.filter((id) => checkedIds.has(id) || !listedIds.has(id));
  const added = [...checkedIds].filter((id) => !attachedSet.has(id));
  return [...kept, ...added];
};
