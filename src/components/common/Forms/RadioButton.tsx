'use client';
import { FC, ReactNode, useId } from 'react';

import { DialRadioButton, DialTooltip } from '@epam/ai-dial-ui-kit';

interface RadioButtonProps {
  caption?: ReactNode;
  checked?: boolean;
  onChange?: () => void;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}

export const RadioButton: FC<RadioButtonProps> = ({
  caption,
  checked,
  onChange,
  disabled,
  tooltip,
  className,
}) => {
  const id = useId();

  const button = (
    <DialRadioButton
      name={id}
      value={id}
      inputId={id}
      label={caption}
      checked={checked}
      onChange={() => onChange?.()}
      disabled={disabled}
      className={className}
    />
  );

  if (tooltip) {
    return <DialTooltip tooltip={tooltip}>{button}</DialTooltip>;
  }
  return button;
};
