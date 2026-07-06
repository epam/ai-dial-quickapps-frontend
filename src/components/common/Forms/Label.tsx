import { IconHelp } from '@tabler/icons-react';
import { FC } from 'react';

import classNames from 'classnames';

import { DialTooltip } from '@epam/ai-dial-ui-kit';

interface LabelProps {
  children?: string;
  htmlFor?: string;
  mandatory?: boolean;
  isSubgroup?: boolean;
  info?: string;
}

export const Label: FC<LabelProps> = ({
  children,
  htmlFor,
  mandatory,
  isSubgroup = false,
  info,
}) => (
  <label
    className={classNames(
      'dial-tiny-text flex items-center gap-1 text-secondary',
      isSubgroup ? 'mb-1' : 'mb-2',
    )}
    htmlFor={htmlFor}
  >
    {children}
    {mandatory && <span className="ml-1 inline text-accent-primary">*</span>}
    {info && (
      <DialTooltip
        tooltip={info}
        triggerClassName="flex shrink-0 p-1 text-secondary hover:text-accent-primary"
        contentClassName="z-[2000]"
      >
        <IconHelp size={16} />
      </DialTooltip>
    )}
  </label>
);
