'use client';
import classNames from 'classnames';
import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualCardGridColumns {
  base: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

const BREAKPOINTS: Array<[key: keyof Omit<VirtualCardGridColumns, 'base'>, px: number]> = [
  ['xl', 1280],
  ['lg', 1024],
  ['md', 768],
  ['sm', 640],
];

const resolveColumnCount = (width: number, columns: VirtualCardGridColumns): number => {
  for (const [key, px] of BREAKPOINTS) {
    const value = columns[key];
    if (width >= px && value != null) return value;
  }
  return columns.base;
};

// Tailwind's sm:/md:/lg:/xl: variants key off viewport width, not container width, so the
// column count used for chunking rows must be derived from the viewport too — otherwise it can
// disagree with the actual CSS grid-template-columns and rows render with empty/misaligned cells.
const useViewportWidth = (): number => {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth,
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
};

interface VirtualCardGridProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  columns: VirtualCardGridColumns;
  rowClassName: string;
  estimatedRowHeight?: number;
  className?: string;
}

const VirtualCardGridComponent = <T,>({
  items,
  getKey,
  renderItem,
  columns,
  rowClassName,
  estimatedRowHeight = 160,
  className,
}: VirtualCardGridProps<T>) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewportWidth = useViewportWidth();
  const columnCount = Math.max(1, resolveColumnCount(viewportWidth, columns));
  const rowCount = Math.ceil(items.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 3,
  });

  return (
    // p-1 keeps room around the edge rows so a hovered card's elevated shadow
    // isn't clipped by the scroll container's own overflow boundary.
    <div ref={scrollRef} className={classNames('overflow-y-auto p-1', className)}>
      <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = items.slice(
            virtualRow.index * columnCount,
            virtualRow.index * columnCount + columnCount,
          );

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className={classNames('absolute start-0 top-0 w-full pb-2', rowClassName)}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {rowItems.map((item) => (
                // display:contents keeps the card itself as the real grid item so it stretches
                // to the row's full height like the rest of the row, instead of the wrapper.
                <div key={getKey(item)} className="contents">
                  {renderItem(item)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VirtualCardGrid = memo(VirtualCardGridComponent) as typeof VirtualCardGridComponent;
