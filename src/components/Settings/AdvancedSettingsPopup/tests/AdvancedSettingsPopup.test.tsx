import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { click, getButton, typeInto } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';

import AdvancedSettingsPopup from '../AdvancedSettingsPopup';

interface MockButtonProps {
  label: string;
  onClick: () => void;
}

interface MockPopupProps {
  open: boolean;
  header: string;
  className?: string;
  closeAriaLabel: string;
  children?: React.ReactNode;
  onClose: () => void;
  additionalButtons: MockButtonProps[];
  mainButtons: MockButtonProps[];
}

interface MockNumberInputProps {
  id?: string;
  'aria-label'?: string;
  labelProps?: { label: string; htmlFor: string };
  value: string;
  placeholder?: string;
  onBlur?: () => void;
  caption?: string;
  error?: string;
  invalid?: boolean;
  onChange: (value?: number | string) => void;
}

interface MockSliderProps {
  labelProps: { label: string };
  value: number;
  min: number;
  max: number;
  step: number;
  showTooltip?: boolean;
  showTicks?: boolean;
  formatValue: (value: number) => string;
  rightContent?: React.ReactNode;
  onChange: (value: number) => void;
}

interface MockSwitchProps {
  isOn: boolean;
  labelProps: { label: string };
  caption?: string;
  onChange: (value: boolean) => void;
}

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  ButtonAppearance: { Link: 'link' },
  ButtonVariant: { Primary: 'primary', Neutral: 'neutral' },
  PopupSize: { Sm: 'sm' },
  Popup: ({
    open,
    header,
    className,
    closeAriaLabel,
    children,
    onClose,
    additionalButtons,
    mainButtons,
  }: MockPopupProps) =>
    open ? (
      <div role="dialog" aria-label={header} className={className}>
        <button type="button" aria-label={closeAriaLabel} onClick={onClose} />
        <div data-testid="body">{children}</div>
        {[...additionalButtons, ...mainButtons].map((button) => (
          <button key={button.label} type="button" onClick={button.onClick}>
            {button.label}
          </button>
        ))}
      </div>
    ) : null,
  NumberInput: ({
    id,
    'aria-label': ariaLabel,
    labelProps,
    placeholder,
    value,
    caption,
    error,
    invalid,
    onChange,
    onBlur,
  }: MockNumberInputProps) => (
    <div>
      {labelProps && <label htmlFor={labelProps.htmlFor}>{labelProps.label}</label>}
      <input
        id={id}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid}
        aria-describedby={id && `${id}-caption`}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {id && <span id={`${id}-caption`}>{error ?? caption}</span>}
    </div>
  ),
  Slider: ({
    labelProps,
    value,
    min,
    max,
    step,
    showTooltip,
    showTicks,
    formatValue,
    rightContent,
    onChange,
  }: MockSliderProps) => (
    <div data-testid="slider" data-ticks={String(showTicks)} data-step={step}>
      <span>{labelProps.label}</span>
      {showTooltip && <span data-testid="slider-tooltip">{formatValue(value)}</span>}
      <div
        role="slider"
        tabIndex={0}
        aria-label={labelProps.label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') onChange(Math.round((value - step) * 10) / 10);
          if (event.key === 'ArrowRight') onChange(Math.round((value + step) * 10) / 10);
        }}
      />
      <div data-testid="slider-right">{rightContent}</div>
    </div>
  ),
  Switch: ({ isOn, labelProps, caption, onChange }: MockSwitchProps) => (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={labelProps.label}
        onClick={() => onChange(!isOn)}
      />
      <span>{caption}</span>
    </div>
  ),
}));

const initialValues: AdvancedSettingsValues = {
  temperature: 0.5,
  maxInputAttachments: 50,
  timestamp: true,
  fileTools: false,
  processLargeFiles: true,
  codeInterpreter: false,
  addAttachment: false,
  webFetch: false,
};

const dom = setupTestRoot();

const renderPopup = (props: Partial<React.ComponentProps<typeof AdvancedSettingsPopup>> = {}) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  dom.render(
    <AdvancedSettingsPopup
      isOpen
      advancedSettings={initialValues}
      isTemperatureAvailable={false}
      isProcessLargeFilesAvailable={false}
      isCodeInterpreterEnabled={false}
      isAddAttachmentEnabled={false}
      isWebFetchEnabled={false}
      onSave={onSave}
      onClose={onClose}
      {...props}
    />,
  );
  return { onSave, onClose };
};

const getSwitch = (name: string) =>
  dom.container.querySelector(`[role="switch"][aria-label="${name}"]`) as HTMLButtonElement;

const getInputByLabel = (text: string) => {
  const label = [...dom.container.querySelectorAll('label')].find(
    (item) => item.textContent === text,
  );
  return document.getElementById(label?.htmlFor ?? '') as HTMLInputElement;
};

const getSlider = () => dom.container.querySelector('[role="slider"]') as HTMLElement;

const pressKey = (element: HTMLElement, key: string) =>
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });

describe('AdvancedSettingsPopup', () => {
  it('renders a named dialog with the three settings in order, seeded from the form', () => {
    renderPopup();

    expect(dom.container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Advanced settings',
    );
    const input = getInputByLabel('Maximum attachments amount user can add');
    expect(input.value).toBe('50');
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Valid only for the cases when attachments enabled for the agent',
    );
    expect(getSwitch('Time awareness').getAttribute('aria-checked')).toBe('true');
    expect(getSwitch('Built-in file tools').getAttribute('aria-checked')).toBe('false');

    const body = dom.container.querySelector('[data-testid="body"]') as HTMLElement;
    expect(body.textContent).toContain('Gives the agent the current date and time');
    expect(body.textContent).toContain('Lets the agent browse, search, read, and edit files');
    const controls = [...body.querySelectorAll('input, [role="switch"]')].map(
      (element) => element.getAttribute('aria-label') ?? 'max attachments',
    );
    expect(controls).toEqual(['max attachments', 'Time awareness', 'Built-in file tools']);
  });

  it('caps the dialog at the design width from the desktop breakpoint', () => {
    renderPopup();

    expect(dom.container.querySelector('[role="dialog"]')?.className).toBe('md:max-w-[586px]');
  });

  it('shows a placeholder in an empty max attachments input', () => {
    renderPopup({ advancedSettings: { ...initialValues, maxInputAttachments: '' } });

    const input = getInputByLabel('Maximum attachments amount user can add');
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('Enter the maximum number of attachments');
  });

  it('renders nothing when closed', () => {
    renderPopup({ isOpen: false });

    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('saves the edited draft and closes', () => {
    const { onSave, onClose } = renderPopup();

    click(getSwitch('Built-in file tools'));
    click(getSwitch('Time awareness'));
    typeInto(getInputByLabel('Maximum attachments amount user can add'), '10');
    click(getButton('Save'));

    expect(onSave).toHaveBeenCalledWith({
      ...initialValues,
      maxInputAttachments: 10,
      timestamp: false,
      fileTools: true,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('saves an empty max attachments value', () => {
    const { onSave } = renderPopup();

    typeInto(getInputByLabel('Maximum attachments amount user can add'), '');
    click(getButton('Save'));

    expect(onSave).toHaveBeenCalledWith({ ...initialValues, maxInputAttachments: '' });
  });

  it('blocks Save and shows an error for a max attachments value that is not a positive integer', () => {
    const { onSave, onClose } = renderPopup();

    const input = getInputByLabel('Maximum attachments amount user can add');
    typeInto(input, '0');
    click(getButton('Save'));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Enter a whole number greater than 0',
    );

    typeInto(input, '3');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('shows an existing form error for max attachments on open', () => {
    renderPopup({ maxInputAttachmentsError: 'Too small' });

    expect(
      getInputByLabel('Maximum attachments amount user can add').getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it.each(['Close advanced settings', 'Close'])(
    'discards the draft when dismissed with %s',
    (name) => {
      const { onSave, onClose } = renderPopup();

      click(getSwitch('Built-in file tools'));
      click(getButton(name));

      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  describe('with temperature and process files available', () => {
    const renderFull = () =>
      renderPopup({ isTemperatureAvailable: true, isProcessLargeFilesAvailable: true });
    const allControls = [
      'Temperature',
      'Temperature value',
      'max attachments',
      'Time awareness',
      'Built-in file tools',
      'Allow orchestrator to process files',
    ];

    it('renders five controls in order, temperature first and process files last', () => {
      renderFull();

      const body = dom.container.querySelector('[data-testid="body"]') as HTMLElement;
      const controls = [...body.querySelectorAll('input, [role="switch"], [role="slider"]')].map(
        (element) => element.getAttribute('aria-label') ?? 'max attachments',
      );
      expect(controls).toEqual(allControls);
      expect(getSwitch('Allow orchestrator to process files').getAttribute('aria-checked')).toBe(
        'true',
      );
      expect(body.textContent).toContain(
        'Handle attachments by reading file content on demand instead of including all attachment content in the initial prompt.',
      );
      expect(body.textContent).not.toContain('Process files');
      expect(body.textContent).not.toContain('Higher values will make the output more random');
    });

    it('shows the scale label in the tooltip and the value in the box, seeded from the form', () => {
      renderFull();

      const slider = dom.container.querySelector('[data-testid="slider"]') as HTMLElement;
      expect(slider.getAttribute('data-ticks')).toBe('true');
      // The kit draws one tick per step, so 0..1 at 0.1 gives exactly 10 steps of ticks.
      const steps =
        (Number(getSlider().getAttribute('aria-valuemax')) -
          Number(getSlider().getAttribute('aria-valuemin'))) /
        Number(slider.getAttribute('data-step'));
      expect(Math.round(steps)).toBe(10);
      expect(dom.container.querySelector('[data-testid="slider-tooltip"]')?.textContent).toBe(
        'Neutral',
      );
      expect(
        (dom.container.querySelector('input[aria-label="Temperature value"]') as HTMLInputElement)
          .value,
      ).toBe('0.5');
      expect(getSlider().getAttribute('aria-valuenow')).toBe('0.5');
      expect(getSlider().getAttribute('aria-valuetext')).toBe('Neutral');
    });

    it('updates the draft temperature with the keyboard without saving', () => {
      const { onSave } = renderFull();

      pressKey(getSlider(), 'ArrowLeft');
      pressKey(getSlider(), 'ArrowLeft');

      expect(dom.container.querySelector('[data-testid="slider-tooltip"]')?.textContent).toBe(
        'Precise',
      );
      expect(
        (dom.container.querySelector('input[aria-label="Temperature value"]') as HTMLInputElement)
          .value,
      ).toBe('0.3');
      expect(onSave).not.toHaveBeenCalled();
    });

    it('saves the edited temperature and process files', () => {
      const { onSave, onClose } = renderFull();

      pressKey(getSlider(), 'ArrowLeft');
      pressKey(getSlider(), 'ArrowLeft');
      click(getSwitch('Allow orchestrator to process files'));
      click(getButton('Save'));

      expect(onSave).toHaveBeenCalledWith({
        ...initialValues,
        temperature: 0.3,
        processLargeFiles: false,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('discards temperature and process-files edits on Close', () => {
      const { onSave, onClose } = renderFull();

      pressKey(getSlider(), 'ArrowRight');
      click(getSwitch('Allow orchestrator to process files'));
      click(getButton('Close'));

      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the slider, its value input and the switches in focus order', () => {
      renderFull();

      const body = dom.container.querySelector('[data-testid="body"]') as HTMLElement;
      const focusable = [...body.querySelectorAll('input, button, [tabindex]')].map(
        (element) => element.getAttribute('aria-label') ?? 'max attachments',
      );
      expect(focusable).toEqual(allControls);
    });

    it('snaps a typed temperature to the step and moves the slider', () => {
      renderFull();

      typeInto(
        dom.container.querySelector('input[aria-label="Temperature value"]') as HTMLInputElement,
        '0.36',
      );

      expect(getSlider().getAttribute('aria-valuenow')).toBe('0.4');
      expect(dom.container.querySelector('[data-testid="slider-tooltip"]')?.textContent).toBe(
        'Neutral',
      );
    });

    it('keeps the typed text while editing and shows the snapped value on blur', () => {
      renderFull();

      const input = dom.container.querySelector(
        'input[aria-label="Temperature value"]',
      ) as HTMLInputElement;
      typeInto(input, '0.36');
      expect(input.value).toBe('0.36');

      act(() => {
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      });
      expect(input.value).toBe('0.4');
    });

    it('saves a temperature typed into the value input', () => {
      const { onSave } = renderFull();

      typeInto(
        dom.container.querySelector('input[aria-label="Temperature value"]') as HTMLInputElement,
        '0.8',
      );
      click(getButton('Save'));

      expect(onSave).toHaveBeenCalledWith({ ...initialValues, temperature: 0.8 });
    });

    it('ignores an empty value input', () => {
      const { onSave } = renderFull();

      typeInto(
        dom.container.querySelector('input[aria-label="Temperature value"]') as HTMLInputElement,
        '',
      );
      click(getButton('Save'));

      expect(onSave).toHaveBeenCalledWith(initialValues);
    });
  });

  describe('feature toggles', () => {
    const renderToggles = (
      props: Partial<React.ComponentProps<typeof AdvancedSettingsPopup>> = {},
    ) =>
      renderPopup({
        isProcessLargeFilesAvailable: true,
        isCodeInterpreterEnabled: true,
        isAddAttachmentEnabled: true,
        isWebFetchEnabled: true,
        ...props,
      });

    it('renders the enabled toggles after process files with their titles and descriptions', () => {
      renderToggles();

      const body = dom.container.querySelector('[data-testid="body"]') as HTMLElement;
      const switches = [...body.querySelectorAll('[role="switch"]')].map((element) =>
        element.getAttribute('aria-label'),
      );
      expect(switches).toEqual([
        'Time awareness',
        'Built-in file tools',
        'Allow orchestrator to process files',
        'Code Interpreter',
        'Add attachment',
        'Web fetch',
      ]);
      expect(body.textContent).toContain('Allows to build multi-agent applications');
      expect(body.textContent).toContain('attaching a file to the final response');
      expect(body.textContent).toContain('fetching an external web resource');
      expect(body.textContent).not.toContain('Allow the agent to');
    });

    it.each([
      ['isCodeInterpreterEnabled', 'Code Interpreter'],
      ['isAddAttachmentEnabled', 'Add attachment'],
      ['isWebFetchEnabled', 'Web fetch'],
    ] as const)('hides the matching switch when %s is off', (prop, name) => {
      renderToggles({ [prop]: false });

      expect(getSwitch(name)).toBeNull();
    });

    it('saves toggled values and keeps unrendered ones unchanged', () => {
      const { onSave } = renderToggles({
        isAddAttachmentEnabled: false,
        advancedSettings: { ...initialValues, addAttachment: true },
      });

      click(getSwitch('Web fetch'));
      click(getSwitch('Code Interpreter'));
      click(getButton('Save'));

      expect(onSave).toHaveBeenCalledWith({
        ...initialValues,
        addAttachment: true,
        codeInterpreter: true,
        webFetch: true,
      });
    });

    it('discards toggle edits on Close', () => {
      const { onSave, onClose } = renderToggles();

      click(getSwitch('Web fetch'));
      click(getButton('Close'));

      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('omits temperature and process files when unavailable but saves their seeded values', () => {
    const { onSave } = renderPopup();

    expect(getSlider()).toBeNull();
    expect(getSwitch('Allow orchestrator to process files')).toBeNull();
    click(getButton('Save'));

    expect(onSave).toHaveBeenCalledWith(initialValues);
  });

  it('uses only logical layout classes and no mirrored icons', () => {
    renderPopup({ isTemperatureAvailable: true, isProcessLargeFilesAvailable: true });

    expect(dom.container.innerHTML).not.toMatch(
      /class="[^"]*\b(ml|mr|pl|pr|left|right|text-left|text-right)-/,
    );
    expect(dom.container.innerHTML).not.toContain('scale-x-[-1]');
  });
});
