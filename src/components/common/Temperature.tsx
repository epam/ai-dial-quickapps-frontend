'use client';

import { IconHelp } from '@tabler/icons-react';
import {
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
  TouchEventHandler,
  useState,
} from 'react';

import { Tooltip } from '@/components/common/Tooltip';

import { DEFAULT_TEMPERATURE } from '@/form/quickApp2Form';

import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { HandleProps } from 'rc-slider/lib/Handles/Handle';

interface TemperatureIndicatorProps extends HandleProps {
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onMouseDown: MouseEventHandler<HTMLDivElement>;
  onTouchStart: TouchEventHandler<HTMLDivElement>;
  children: ReactNode;
}

const TemperatureIndicator = ({
  style,
  onKeyDown,
  onMouseDown,
  onTouchStart,
  children,
}: TemperatureIndicatorProps) => {
  return (
    <div
      className="absolute top-[calc(50%-20px)] flex size-10 cursor-pointer items-center justify-center rounded-full bg-layer-3 shadow"
      style={style}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {children}
    </div>
  );
};

interface Props {
  temperature: number | undefined;
  label?: string;
  disabled?: boolean;
  tooltip?: string;
  onChangeTemperature: (temperature: number) => void;
}

export const TemperatureSlider: FC<Props> = ({
  temperature,
  label,
  disabled,
  tooltip,
  onChangeTemperature,
}) => {
  const [currentTemperature, setCurrentTemperature] = useState<number>(() => {
    return temperature ?? DEFAULT_TEMPERATURE;
  });

  const handleChange = (value: number) => {
    setCurrentTemperature(value);
    onChangeTemperature(value);
  };

  return (
    <Tooltip triggerClassName="w-full" tooltip={tooltip}>
      <div className={disabled ? 'pointer-events-none opacity-50' : undefined}>
        <div className="flex flex-col gap-2" data-qa="temp-slider">
          {!!label && (
            <div className="flex items-center gap-2">
              <label className="text-start">{label}</label>
              <Tooltip
                triggerClassName="text-secondary"
                tooltip="Higher values will make the output more random, while lower values will make it more focused and deterministic."
              >
                <IconHelp size={18} />
              </Tooltip>
            </div>
          )}
          <div className="relative px-5">
            <Slider
              className="temperature-slider !h-10"
              value={temperature}
              onChange={(value) =>
                typeof value === 'number' && handleChange(value)
              }
              min={0}
              max={1}
              step={0.1}
              handleRender={({ props }) => (
                <TemperatureIndicator
                  {...(props as unknown as TemperatureIndicatorProps)}
                >
                  {currentTemperature}
                </TemperatureIndicator>
              )}
            />
          </div>
          <div className="grid h-4 w-full grid-cols-3 text-xs">
            <span>Precise</span>
            <span className="text-center">Neutral</span>
            <span className="text-end">Creative</span>
          </div>
        </div>
      </div>
    </Tooltip>
  );
};
