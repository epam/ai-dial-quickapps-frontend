import type { editor } from 'monaco-editor';

import type { EditorThemes } from '@epam/ai-dial-ui-kit';

// The Edit JSON code box in the design is plain white with no line numbers and its own token
// colours (keys blue, strings green, numbers orange, booleans purple, punctuation grey), none of
// which the kit's built-in light theme matches. Monaco takes literal hex values, so these mirror
// the kit tokens `text-accent`, `text-visual-green-3`, `text-visual-brown-2` and `text-secondary`.
const LIGHT_EDIT_JSON_THEME: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: false,
  rules: [
    { token: 'string.key.json', foreground: '1D4ED8' },
    { token: 'string.value.json', foreground: '065F46' },
    { token: 'number', foreground: 'B45309' },
    { token: 'keyword.json', foreground: '7C3FB3' },
    { token: 'delimiter', foreground: '57647A' },
    { token: 'delimiter.bracket.json', foreground: '57647A' },
    { token: 'delimiter.parenthesis', foreground: '57647A' },
  ],
  colors: {
    'editor.background': '#FCFCFC',
    'editor.foreground': '#161B2D',
    'editor.lineHighlightBackground': '#00000000',
    'editorCursor.foreground': '#161B2D',
    'editor.selectionBackground': '#5C8DEA2B',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#D1DBEA99',
    'scrollbarSlider.hoverBackground': '#B2C2DD99',
    'scrollbarSlider.activeBackground': '#B2C2DD',
  },
};

// Only the light theme is replaced. The kit asks for both entries but defines just the one that
// matches `currentTheme`, so the dark popup keeps the kit's own theme (the prop is left unset).
export const EDIT_JSON_LIGHT_THEMES_CONFIG: Record<EditorThemes, editor.IStandaloneThemeData> = {
  light: LIGHT_EDIT_JSON_THEME,
  dark: LIGHT_EDIT_JSON_THEME,
};

export const EDIT_JSON_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  tabSize: 2,
  lineNumbers: 'off',
  // Sections can be collapsed; the fold arrows show on hover in the space left of the text.
  folding: true,
  showFoldingControls: 'mouseover',
  foldingHighlight: false,
  glyphMargin: false,
  // Monaco adds 16px for the folding column to this, so the text starts about 18px inside the box
  // border, as in the design.
  lineDecorationsWidth: 2,
  fontSize: 13,
  lineHeight: 21,
  lineNumbersMinChars: 0,
  renderLineHighlight: 'none',
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  guides: { indentation: false },
  padding: { top: 20, bottom: 16 },
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
};
