/** The content-file loader for an entity without a file package: loads nothing. */
export const loadNoContentFile = async (): Promise<string | undefined> => undefined;

/** Hides a catalog details header action (Share, Publish, Download), which shows by default. */
export const hideHeaderAction = (): boolean => false;
