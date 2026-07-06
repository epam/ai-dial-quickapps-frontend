"use client";

import { IconAlertTriangleFilled } from "@tabler/icons-react";
import { DialSwitch, DialTooltip } from "@epam/ai-dial-ui-kit";
import { FC, useId } from "react";

import classNames from "classnames";

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
    <div
      className={classNames("flex items-center gap-2", className)}
    >
      <DialSwitch
        switchId={switchId}
        isOn={isOn}
        label={additionalText}
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
