'use client';
import { FC, ReactNode, memo, useCallback, useRef, useState } from 'react';

import { DialTooltip } from '@epam/ai-dial-ui-kit';

export interface HoverableTooltipProps {
  tooltip: ReactNode;
  children: ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
}

const TOOLTIP_CLOSE_DELAY_MS = 250;

/**
 * DialTooltip closes the instant the cursor leaves the trigger (no close delay),
 * so a cursor moving toward interactive content inside the tooltip (e.g. a link)
 * never makes it there. This wraps DialTooltip in controlled mode and keeps it
 * open while the cursor is over the trigger or the tooltip content, with a short
 * grace delay in between so the cursor has time to travel.
 */
const HoverableTooltip: FC<HoverableTooltipProps> = ({
  tooltip,
  children,
  triggerClassName,
  contentClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setIsOpen(false), TOOLTIP_CLOSE_DELAY_MS);
  }, [cancelClose]);

  const handleOpen = useCallback(() => {
    cancelClose();
    setIsOpen(true);
  }, [cancelClose]);

  return (
    <span onMouseEnter={handleOpen} onMouseLeave={scheduleClose} className={triggerClassName}>
      <DialTooltip
        open={isOpen}
        onOpenChange={setIsOpen}
        contentClassName={contentClassName}
        tooltip={
          <span onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
            {tooltip}
          </span>
        }
      >
        {children}
      </DialTooltip>
    </span>
  );
};

export default memo(HoverableTooltip);
