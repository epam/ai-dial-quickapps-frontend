import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import KnowledgeBaseRow from '../KnowledgeBaseRow';

interface MockModalProps {
  initialFileIds?: string[];
  onClose: (fileIds: string[]) => void;
}

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
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

const dom = setupTestRoot();

const renderRow = (props: Partial<React.ComponentProps<typeof KnowledgeBaseRow>> = {}) => {
  const onAddFiles = vi.fn();
  const onRemoveFile = vi.fn();
  dom.render(
    <KnowledgeBaseRow
      files={[]}
      isReadonly={false}
      onAddFiles={onAddFiles}
      onRemoveFile={onRemoveFile}
      {...props}
    />,
  );
  return { onAddFiles, onRemoveFile };
};

const findButton = (label: string) => getButton(label, dom.container) as HTMLButtonElement;
const getModal = () => dom.container.querySelector('[role="dialog"][aria-label="File manager"]');

describe('KnowledgeBaseRow', () => {
  it('shows the title, description and Add action when empty', () => {
    renderRow();

    expect(dom.container.querySelector('h3')?.textContent).toBe(
      QuickAppEditorI18nKeys.KnowledgeBase,
    );
    expect(dom.container.textContent).toContain(QuickAppEditorI18nKeys.KnowledgeBaseDescription);
    expect(findButton(CommonI18nKeys.Add)).toBeDefined();
    expect(dom.container.querySelector('ul')).toBeNull();
  });

  it('lists files without the description but keeps the Add action', () => {
    renderRow({ files: ['files/abc/a.pdf', 'files/abc/b.pdf'] });

    expect(dom.container.querySelectorAll('ul > li')).toHaveLength(2);
    expect(dom.container.textContent).not.toContain(
      QuickAppEditorI18nKeys.KnowledgeBaseDescription,
    );
    expect(findButton(CommonI18nKeys.Add)).toBeDefined();
  });

  it('opens the popup with the current files and adds the confirmed selection', () => {
    const { onAddFiles } = renderRow({ files: ['files/abc/a.pdf'] });

    expect(getModal()).toBeNull();
    click(findButton(CommonI18nKeys.Add));
    expect(getModal()?.textContent).toContain('files/abc/a.pdf');

    click(findButton('Modal confirm'));
    expect(onAddFiles).toHaveBeenCalledWith(['files/abc/new.pdf']);
    expect(getModal()).toBeNull();
  });

  it('changes nothing when the popup is dismissed without a selection', () => {
    const { onAddFiles } = renderRow();

    click(findButton(CommonI18nKeys.Add));
    click(findButton('Modal dismiss'));

    expect(onAddFiles).not.toHaveBeenCalled();
    expect(getModal()).toBeNull();
  });

  it('removes the activated file', () => {
    const { onRemoveFile } = renderRow({ files: ['files/abc/a.pdf', 'files/abc/b.pdf'] });

    click(dom.container.querySelector('button[aria-label="Remove b.pdf from knowledge base"]'));

    expect(onRemoveFile).toHaveBeenCalledWith('files/abc/b.pdf');
  });

  it('disables Add and hides trash buttons when read-only', () => {
    renderRow({ files: ['files/abc/a.pdf'], isReadonly: true });

    const addButton = findButton(CommonI18nKeys.Add);
    expect(addButton.disabled || addButton.getAttribute('aria-disabled') === 'true').toBe(true);
    click(findButton(CommonI18nKeys.Add));
    expect(getModal()).toBeNull();
    expect(dom.container.querySelectorAll('ul > li')).toHaveLength(1);
    expect(dom.container.querySelector('ul > li button')).toBeNull();
  });
});
