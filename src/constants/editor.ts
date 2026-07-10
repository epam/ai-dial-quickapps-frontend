export const DIAL_EDITOR_TRIGGER_SAVE_EVENT = 'dial-editor-trigger-save';

export const AUTO_SAVE_INTERVAL_MS = 30_000;

/**
 * window.name set on the OAuth popup before opening it. Chat's toolset login
 * callback checks this (alongside window.opener) to route the popup-based
 * login handshake instead of its own sessionStorage-based admin flow.
 */
export const QUICKAPPS_TOOLSET_AUTH_POPUP_NAME = 'quickapps-toolset-auth-popup';
