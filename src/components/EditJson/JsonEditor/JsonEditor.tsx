// Before the editor: points @monaco-editor/react at the bundled Monaco.
import '@/monaco-setup';

import { Editor, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';

import { mergeClasses, Spinner, type EditorThemes } from '@epam/ai-dial-ui-kit';

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
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const frameRef = useRef<number | undefined>(undefined);

  // `onMount` fires when Monaco has created the editor, but its first paint is still unstyled:
  // the font is not measured and the injected token/cursor styles have not applied, so the
  // lines show glued into one for a moment. Keep the editor invisible until the fonts are
  // ready and two frames have painted.
  useEffect(() => {
    if (!isMounted) return;
    let isCancelled = false;
    const reveal = async () => {
      await document.fonts?.ready;
      if (isCancelled) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => setIsReady(true));
      });
    };
    void reveal();
    return () => {
      isCancelled = true;
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [isMounted]);

  const handleMount = useCallback(() => setIsMounted(true), []);

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
    <div className="relative h-full">
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Spinner fullWidth />
        </div>
      )}
      <div className={mergeClasses('h-full', !isReady && 'invisible')}>
        <Editor
          onMount={handleMount}
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
      </div>
    </div>
  );
};

export default JsonEditor;
