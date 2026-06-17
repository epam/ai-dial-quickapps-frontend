'use client';
import { EditorProps } from '@monaco-editor/react';
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconExclamationCircleFilled,
} from '@tabler/icons-react';
import React, { memo, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import classNames from 'classnames';
import { CloseButtonSmall } from './CloseButtons';
import { nanoid } from 'nanoid';
import omit from 'lodash-es/omit';

const Editor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.Editor),
  { ssr: false },
);

const defaultEditorOptions: EditorProps['options'] = {
  minimap: { enabled: false },
  padding: { top: 12, bottom: 12 },
  scrollBeyondLastLine: false,
  scrollbar: { alwaysConsumeMouseWheel: false },
  automaticLayout: true,
};

interface MonacoEditorProps extends EditorProps {
  allowFullScreen?: boolean;
  errors?: string[];
  renderButtons?: () => React.ReactNode;
}

export const MonacoEditor = memo(function MonacoEditor(
  props: MonacoEditorProps,
) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const errorsWithIds = useMemo(
    () => props.errors?.map((error) => ({ id: nanoid(), error })) ?? [],
    [props.errors],
  );

  const wrapperStyles = useMemo(
    () =>
      isFullScreen
        ? undefined
        : { width: props.width ?? '100%', height: props.height ?? '100%' },
    [isFullScreen, props.width, props.height],
  );

  const FullScreenIcon = isFullScreen ? IconArrowsMinimize : IconArrowsMaximize;

  return (
    <div
      style={wrapperStyles}
      className={classNames('relative flex flex-col overflow-hidden', {
        '!fixed left-0 top-0 z-40 h-[100vh] w-[100vw]': isFullScreen,
        'rounded border border-tertiary bg-layer-3': props.allowFullScreen,
        '!border-error': !!errorsWithIds.length,
      })}
    >
      {props.allowFullScreen && (
        <div className="flex items-center justify-between border-b border-tertiary bg-layer-3">
          {props.renderButtons?.()}
          <button
            className="px-[13px] py-2 text-secondary hover:text-accent-primary"
            onClick={() => setIsFullScreen((v) => !v)}
          >
            <FullScreenIcon size={18} />
          </button>
        </div>
      )}
      <div className="flex min-h-0 min-w-0 max-w-full shrink grow">
        <div
          className={classNames(
            'h-full min-h-0 min-w-0 shrink grow',
            props.allowFullScreen && 'p-2',
          )}
        >
          <Editor
            {...omit(props, [
              'allowFullScreen',
              'errors',
              'renderButtons',
              'width',
              'height',
            ])}
            options={{ ...defaultEditorOptions, ...props.options }}
            width="100%"
            height="100%"
          />
        </div>
        {!!errorsWithIds.length && (
          <div
            className={classNames(
              'flex h-full flex-col border-l border-tertiary bg-layer-3 p-3',
              showErrors ? 'w-full max-w-[400px]' : 'cursor-pointer',
            )}
            onClick={!showErrors ? () => setShowErrors(true) : undefined}
          >
            <div
              className={classNames(
                'flex items-center gap-2 text-sm font-semibold text-primary',
                showErrors
                  ? '[writing-mode:horizontal-tb]'
                  : '[writing-mode:vertical-rl]',
              )}
            >
              <IconExclamationCircleFilled
                size={18}
                className={classNames(
                  'text-error',
                  !showErrors && 'rotate-90',
                )}
              />
              {errorsWithIds.length}{' '}
              {errorsWithIds.length === 1 ? 'error' : 'errors'}
              {showErrors && (
                <CloseButtonSmall
                  onClick={() => setShowErrors(false)}
                  className="ml-auto"
                />
              )}
            </div>
            {showErrors && (
              <div className="flex grow flex-col gap-3 overflow-scroll py-3">
                {errorsWithIds.map(({ error, id }) => (
                  <p key={id} className="text-error">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
