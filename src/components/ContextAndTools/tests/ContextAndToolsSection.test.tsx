import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuickApp2Form } from '@/form/quickApp2Form';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@epam/ai-dial-ui-kit', () => ({
  DialFormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Switch: () => null,
}));

vi.mock('@/components/common/FormCollapsibleSection', () => ({
  FormCollapsibleSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock('../AgentsAndToolsetsField', () => ({
  AgentsAndToolsetsField: () => null,
}));

vi.mock('../CodeInterpreterField', () => ({
  CodeInterpreterField: () => null,
}));

vi.mock('@/components/common/FilesSelector/FilesSelector', () => ({
  FilesSelector: ({
    files,
    onAddFiles,
    onRemoveFile,
  }: {
    files: string[];
    onAddFiles: (files: string[]) => void;
    onRemoveFile: (file: string) => void;
  }) => (
    <div>
      <output data-testid="files">{files.join('|')}</output>
      <button type="button" data-testid="add-files" onClick={() => onAddFiles(['existing', 'new%20file'])} />
      <button type="button" data-testid="remove-file" onClick={() => onRemoveFile('existing')} />
    </div>
  ),
}));

import ContextAndToolsSection from '../ContextAndToolsSection';

const FormHarness = () => {
  const { control } = useForm<QuickApp2Form>({
    defaultValues: {
      documentRelativeUrl: ['existing'],
    },
  });

  return (
    <ContextAndToolsSection
      control={control}
      isReadonly={false}
      isCodeInterpreterEnabled={false}
      isWebFetchEnabled={false}
      isAddAttachmentEnabled={false}
    />
  );
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ContextAndToolsSection file selection', () => {
  it('decodes new files, deduplicates existing files, and removes selected files', () => {
    act(() => {
      root.render(<FormHarness />);
    });

    expect(container.querySelector('[data-testid="files"]')?.textContent).toBe('existing');

    act(() => {
      container.querySelector('[data-testid="add-files"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    expect(container.querySelector('[data-testid="files"]')?.textContent).toBe('existing|new file');

    act(() => {
      container.querySelector('[data-testid="remove-file"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    expect(container.querySelector('[data-testid="files"]')?.textContent).toBe('new file');
  });
});
