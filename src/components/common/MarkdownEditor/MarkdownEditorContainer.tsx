"use client";

import { type OnValidate } from "@monaco-editor/react";
import { type PreviewType } from "@uiw/react-md-editor";
import { type FC, type ReactNode, useCallback, useState } from "react";

import dynamic from "next/dynamic";

import { Label } from "@/components/common/Forms/Label";
import { ToggleSwitch } from "@/components/common/ToggleSwitch/ToggleSwitch";
import { useThemeContext } from "@/context/ThemeContext";
import { ThemeId } from "@/types/theme";

import { LazyDialJsonEditor, LazyDialMarkdownEditor } from "@epam/ai-dial-ui-kit";

export enum EditorThemes {
  dark = "dark",
  light = "light",
}

export type EditorTheme = `${EditorThemes}`;

const DialMarkdownEditor = dynamic(
  async () => (await LazyDialMarkdownEditor()).DialMarkdownEditor,
  { ssr: false },
);

const DialJsonEditor = dynamic(
  async () => (await LazyDialJsonEditor()).DialJsonEditor,
  { ssr: false },
);

export interface DialMarkdownEditorContainerProps {
  value?: string;
  onChangeValue?: (value: string) => void;
  label?: ReactNode;
  headerContent?: ReactNode;
  switcherLabel?: string;
  height?: number;
  theme?: EditorTheme;
  onValidateJSON?: OnValidate;
  preview?: PreviewType;
  placeholder?: string;
}


export const DialMarkdownEditorContainer: FC<
  DialMarkdownEditorContainerProps
> = ({
  value,
  onChangeValue,
  label,
  headerContent,
  switcherLabel,
  height = 300,
  theme,
  onValidateJSON,
  preview = "edit",
  placeholder,
}) => {
  const { currentTheme } = useThemeContext();
  const resolvedTheme: EditorTheme =
    theme ?? (currentTheme?.id === ThemeId.Light ? EditorThemes.light : EditorThemes.dark);
  const [isJSONContentMode, setIsJSONContentMode] = useState(false);
  // Keep Monaco mounted once activated to avoid remount flicker when toggling back.
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChangeValue?.(val ?? "");
    },
    [onChangeValue],
  );

  const handleToggleSwitch = useCallback(() => {
    setIsJSONContentMode((prev) => !prev);
    setIsEditorMounted(true);
  }, []);

  const showSwitcher = Boolean(switcherLabel);

  return (
    <div className="flex w-full flex-col">
      {(label || headerContent || showSwitcher) && (
        <div className="flex items-center justify-between">
          {label && <Label>{label as string}</Label>}
          <div className="flex flex-1 items-center justify-end gap-2">
            {headerContent}
            {showSwitcher && (
              <ToggleSwitch
                isOn={isJSONContentMode}
                handleSwitch={handleToggleSwitch}
                additionalText={switcherLabel as string}
              />
            )}
          </div>
        </div>
      )}

      {showSwitcher && isJSONContentMode ? (
        <div
          className="rounded border border-primary"
          style={{ height: `${height}px` }}
        >
          {isEditorMounted && (
            <DialJsonEditor
              value={value}
              onChange={handleChange}
              onValidateJSON={onValidateJSON}
              currentTheme={resolvedTheme === EditorThemes.dark ? "vs-dark" : "light"}
              options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
            />
          )}
        </div>
      ) : (
        <DialMarkdownEditor
          value={value}
          onChange={onChangeValue}
          height={height}
          preview={preview}
          theme={resolvedTheme as EditorThemes}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};
