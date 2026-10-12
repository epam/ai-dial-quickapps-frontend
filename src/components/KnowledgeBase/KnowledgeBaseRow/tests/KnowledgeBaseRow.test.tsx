import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';

import KnowledgeBaseRow from '../KnowledgeBaseRow';

interface MockModalProps {
  initialFileIds?: string[];
  onClose: (fileIds: string[]) => void;
}

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
  }),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { bucket: 'abc' } }),
}));
vi.mock('@/components/common/FileManagerModal/FileManagerModal', () => ({
  default: ({ initialFileIds, onClose }: MockModalProps) => (
    <div role="dialog" aria-label="File manager">
      <span>{(initialFileIds ?? []).join(',')}</span>
      <button type="button" onClick={() => onClose(['files/abc/new.pdf'])}>
        Modal confirm
      </button>
      <button type="button" onClick={() => onClose([])}>
        Modal dismiss
      </button>
    </div>
  ),
}));

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

const renderRow = (props: Partial<React.ComponentProps<typeof KnowledgeBaseRow>> = {}) => {
  const onAddFiles = vi.fn();
  const onRemoveFile = vi.fn();
  act(() =>
    root.render(
      <KnowledgeBaseRow
        files={[]}
        isReadonly={false}
        onAddFiles={onAddFiles}
        onRemoveFile={onRemoveFile}
        {...props}
      />,
    ),
  );
  return { onAddFiles, onRemoveFile };
};

const findButton = (label: string) =>
  [...container.querySelectorAll('button')].find(
    (button) => button.textContent === label,
  ) as HTMLButtonElement;
const getModal = () => container.querySelector('[role="dialog"][aria-label="File manager"]');

describe('KnowledgeBaseRow', () => {
  it('shows the title, description and Add action when empty', () => {
    renderRow();

    expect(container.querySelector('h3')?.textContent).toBe(QuickAppEditorI18nKeys.KnowledgeBase);
    expect(container.textContent).toContain(QuickAppEditorI18nKeys.KnowledgeBaseDescription);
    expect(findButton(CommonI18nKeys.Add)).toBeDefined();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('lists files without the description but keeps the Add action', () => {
    renderRow({ files: ['files/abc/a.pdf', 'files/abc/b.pdf'] });

    expect(container.querySelectorAll('ul > li')).toHaveLength(2);
    expect(container.textContent).not.toContain(QuickAppEditorI18nKeys.KnowledgeBaseDescription);
    expect(findButton(CommonI18nKeys.Add)).toBeDefined();
  });

  it('opens the popup with the current files and adds the confirmed selection', () => {
    const { onAddFiles } = renderRow({ files: ['files/abc/a.pdf'] });

    expect(getModal()).toBeNull();
    act(() => findButton(CommonI18nKeys.Add).click());
    expect(getModal()?.textContent).toContain('files/abc/a.pdf');

    act(() => findButton('Modal confirm').click());
    expect(onAddFiles).toHaveBeenCalledWith(['files/abc/new.pdf']);
    expect(getModal()).toBeNull();
  });

  it('changes nothing when the popup is dismissed without a selection', () => {
    const { onAddFiles } = renderRow();

    act(() => findButton(CommonI18nKeys.Add).click());
    act(() => findButton('Modal dismiss').click());

    expect(onAddFiles).not.toHaveBeenCalled();
    expect(getModal()).toBeNull();
  });

  it('removes the activated file', () => {
    const { onRemoveFile } = renderRow({ files: ['files/abc/a.pdf', 'files/abc/b.pdf'] });

    act(() =>
      (container.querySelector('button[aria-label="Remove b.pdf from knowledge base"]') as HTMLButtonElement).click(),
    );

    expect(onRemoveFile).toHaveBeenCalledWith('files/abc/b.pdf');
  });

  it('disables Add and hides trash buttons when read-only', () => {
    renderRow({ files: ['files/abc/a.pdf'], isReadonly: true, tooltip: 'Shared' });

    const addButton = findButton(CommonI18nKeys.Add);
    expect(addButton.disabled || addButton.getAttribute('aria-disabled') === 'true').toBe(true);
    act(() => findButton(CommonI18nKeys.Add).click());
    expect(getModal()).toBeNull();
    expect(container.querySelectorAll('ul > li')).toHaveLength(1);
    expect(container.querySelector('ul > li button')).toBeNull();
  });
});
