'use client';
import classNames from 'classnames';
import { FC, useLayoutEffect, useRef, useState } from 'react';

import { DialTag, DialTooltip } from '@epam/ai-dial-ui-kit';

export interface TopicTagProps {
  label: string;
  className?: string;
}

export const TopicTag: FC<TopicTagProps> = ({ label, className = 'dial-tiny-text' }) => (
  <DialTag label={label} className={classNames(className, 'text-secondary')} />
);

const MAX_ROWS = 1;

export interface TopicsLineProps {
  topics: string[];
  overflowAriaLabel?: (count: number) => string;
}

export const TopicsLine: FC<TopicsLineProps> = ({ topics, overflowAriaLabel }) => {
  const [visibleCount, setVisibleCount] = useState(topics.length);
  const topicsRef = useRef<HTMLDivElement>(null);

  const topicsKey = topics.join('\0');

  useLayoutEffect(() => {
    const container = topicsRef.current;
    if (!container || topics.length === 0) {
      setVisibleCount(topics.length);
      return;
    }

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const firstTop = children[0].offsetTop;
    const rowHeight = children[0].offsetHeight;
    const limitTop = firstTop + rowHeight * MAX_ROWS;

    let cutoff = children.length;
    for (let i = 0; i < children.length; i++) {
      if (children[i].offsetTop >= limitTop) {
        cutoff = i;
        break;
      }
    }

    setVisibleCount(cutoff < children.length ? Math.max(0, cutoff - 1) : children.length);
  }, [topicsKey, topics.length]);

  const overflow = topics.length - visibleCount;

  return (
    <div ref={topicsRef} className="flex flex-wrap gap-2">
      {topics.slice(0, visibleCount).map((p) => (
        <TopicTag key={p} label={p} />
      ))}
      {overflow > 0 && (
        <DialTooltip tooltip={topics.slice(visibleCount).join(', ')}>
          <span aria-label={overflowAriaLabel?.(overflow) ?? `and ${overflow} more topics`}>
            <TopicTag label={`+${overflow}`} />
          </span>
        </DialTooltip>
      )}
    </div>
  );
};
