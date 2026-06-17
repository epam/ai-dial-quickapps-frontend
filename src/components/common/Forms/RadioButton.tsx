'use client';
import { IconCircle, IconCircleFilled } from '@tabler/icons-react';
import React, { InputHTMLAttributes, useId } from 'react';
import classNames from 'classnames';

interface RadioButtonProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  caption?: React.ReactNode;
  className?: string;
  tooltip?: string;
}

export const RadioButton = ({
  caption,
  checked,
  className,
  tooltip,
  ...rest
}: RadioButtonProps) => {
  const generatedId = useId();
  const id = rest.id ?? generatedId;

  return (
    <label
      htmlFor={id}
      className={classNames(
        'group flex select-none items-center justify-start gap-2',
        !checked && !rest.disabled ? 'cursor-pointer' : '',
        rest.disabled ? 'cursor-not-allowed text-controls-primary-disable' : '',
        className,
      )}
      title={tooltip}
    >
      <input
        id={id}
        type="radio"
        {...rest}
        checked={checked}
        className="peer sr-only"
      />
      {checked ? (
        <IconCircleFilled
          size={18}
          className={classNames(
            'text-accent-primary',
            rest.disabled && 'text-controls-primary-disable',
          )}
        />
      ) : (
        <IconCircle
          size={18}
          className={classNames(
            'text-secondary',
            rest.disabled && 'text-controls-primary-disable',
          )}
          strokeWidth={1}
        />
      )}
      {!!caption && (
        <span
          className={classNames(
            'text-sm',
            rest.disabled ? 'text-secondary' : 'text-primary',
          )}
        >
          {caption}
        </span>
      )}
    </label>
  );
};
