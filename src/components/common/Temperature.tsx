"use client";

import { IconHelp } from "@tabler/icons-react";
import { DialSlider, DialTooltip } from "@epam/ai-dial-ui-kit";
import { FC } from "react";

import { DEFAULT_TEMPERATURE } from "@/form/quickApp2Form";

interface TemperatureSliderProps {
  temperature: number | undefined;
  label?: string;
  disabled?: boolean;
  tooltip?: string;
  onChangeTemperature: (temperature: number) => void;
}

export const TemperatureSlider: FC<TemperatureSliderProps> = ({
  temperature,
  label,
  disabled,
  onChangeTemperature,
}) => {
  return (
    <div className="max-w-lg">
      <DialSlider
        value={temperature ?? DEFAULT_TEMPERATURE}
        min={0}
        max={1}
        step={0.1}
        disabled={disabled}
        labels={["Precise", "Neutral", "Creative"]}
        labelProps={
          label
            ? {
                label: (
                  <div className="flex items-center gap-2">
                    <span>{label}</span>
                    <DialTooltip
                      triggerClassName="text-secondary"
                      tooltip="Higher values will make the output more random, while lower values will make it more focused and deterministic."
                    >
                      <IconHelp size={18} />
                    </DialTooltip>
                  </div>
                ),
              }
            : undefined
        }
        onChange={onChangeTemperature}
      />
    </div>
  );
};
