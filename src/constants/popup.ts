/**
 * Class names that make a UI kit `Popup` fill the screen below the `md` breakpoint and keep the
 * kit's centred dialog from `md` up.
 *
 * The kit means its popup to fill the screen below `md`, but its overlay keeps a 24px padding there
 * and the dialog keeps its rounded corners and content height. Pass `className` through
 * `mergeClasses` with the caller's own classes.
 */
export const MOBILE_FULLSCREEN_POPUP_CLASS_NAMES = {
  // `overflow-hidden!` beats the overlay's inline `overflow: auto`: the dialog already fits the
  // overlay, and without this a few stray pixels of overflow draw a scrollbar beside the dialog.
  overlayClassName: 'p-0 md:p-4 overflow-hidden!',
  className: 'h-full rounded-none md:h-auto md:rounded-xl',
  headerClassName: 'px-4 py-3 md:px-6 md:py-4',
  footerClassName: 'px-4 py-3 md:px-6 md:py-4',
};
