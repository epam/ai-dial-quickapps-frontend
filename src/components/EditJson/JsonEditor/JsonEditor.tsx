// Before the editor: points @monaco-editor/react at the bundled Monaco.
import '@/monaco-setup';

import { Editor, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { type FC, useCallback } from 'react';

import type { EditorThemes } from '@epam/ai-dial-ui-kit';

export interface JsonEditorProps {
  value?: string;
  currentTheme: EditorThemes;
  themesConfig: Record<EditorThemes, editor.IStandaloneThemeData>;
  onChange: (value: string | undefined) => void;
  options?: editor.IStandaloneEditorConstructionOptions;
}

// ui-kit 0.16 removed its 1.0 `DialJsonEditor` with no replacement; this is the same Monaco
// set-up, kept here because Edit JSON is the only JSON editor in the app. It is also the app's
// only Monaco user, so `monaco-setup.ts` is imported here and loads with this lazy module, not
// at app startup.
const JsonEditor: FC<JsonEditorProps> = ({
  value,
  currentTheme,
  themesConfig,
  onChange,
  options,
}) => {
  const handleBeforeMount = useCallback(
    (monaco: Monaco) => {
      monaco.editor.defineTheme(currentTheme, themesConfig[currentTheme]);
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: false,
        schemas: [
          {
            uri: 'http://custom-schema/object-required.json',
            fileMatch: ['*'],
            schema: {
              type: 'object',
              description: 'Top-level value must be an object',
              additionalProperties: true,
            },
          },
        ],
      });
    },
    [currentTheme, themesConfig],
  );

  return (
    <Editor
      beforeMount={handleBeforeMount}
      height="100%"
      defaultLanguage="json"
      value={value}
      onChange={onChange}
      theme={currentTheme}
      options={{
        minimap: { enabled: false },
        formatOnType: true,
        formatOnPaste: true,
        selectOnLineNumbers: false,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        smoothScrolling: true,
        stickyScroll: { enabled: false },
        overviewRulerLanes: 0,
        scrollbar: {
          horizontal: 'hidden',
          verticalScrollbarSize: 4,
          verticalSliderSize: 4,
        },
        ...options,
      }}
    />
  );
};

export default JsonEditor;
