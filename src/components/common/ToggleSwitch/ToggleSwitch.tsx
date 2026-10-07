import { IconAlertTriangleFilled } from '@tabler/icons-react';
import { DialTooltip, Switch } from '@epam/ai-dial-ui-kit';
import { FC, useId } from 'react';

import classNames from 'classnames';

interface ToggleSwitchProps {
  isOn: boolean;
  handleSwitch: () => void;
  additionalText?: string;
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  warning?: string;
}

export const ToggleSwitch: FC<ToggleSwitchProps> = ({
  isOn,
  handleSwitch,
  additionalText,
  className,
  disabled,
  tooltip,
  warning,
}) => {
  const switchId = useId();

  const inner = (
    // `relative` anchors the ui-kit Switch's `sr-only` (position: absolute) checkbox here.
    // Without it the checkbox is positioned against the iframe's viewport, and focusing it
    // on click scrolls the `overflow-hidden` html/body to bring it into view.
    <div className={classNames('relative flex items-center gap-2', className)}>
      <Switch
        id={switchId}
        isOn={isOn}
        labelProps={additionalText ? { label: additionalText } : undefined}
        disabled={disabled}
        onChange={() => handleSwitch()}
      />
      {warning && (
        <DialTooltip
          tooltip={warning}
          triggerClassName="flex shrink-0 text-warning"
          contentClassName="z-[2000]"
        >
          <IconAlertTriangleFilled size={20} />
        </DialTooltip>
      )}
    </div>
  );

  if (tooltip) {
    return <DialTooltip tooltip={tooltip}>{inner}</DialTooltip>;
  }
  return inner;
};
