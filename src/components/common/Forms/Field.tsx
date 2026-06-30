import { IconEye, IconEyeOff } from '@tabler/icons-react';
import {
  InputHTMLAttributes,
  ReactNode,
  forwardRef,
  useCallback,
  useState,
} from 'react';

import classNames from 'classnames';

import { withErrorMessage } from '@/components/common/Forms/FieldErrorMessage';
import { withLabel } from '@/components/common/Forms/Label';

import { DialButton, DialTooltip } from '@epam/ai-dial-ui-kit';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  tooltip?: ReactNode;
  dataQa?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, tooltip, dataQa, type, ...rest }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    const inputType =
      type === 'password' ? (isVisible ? 'text' : 'password') : type;

    const handleTogglePassword = useCallback(() => {
      setIsVisible((prev) => !prev);
    }, []);

    return (
      <DialTooltip tooltip={tooltip} triggerClassName="grow">
        <div className="relative">
          <input
            {...rest}
            ref={ref}
            className={classNames(
              'peer mx-0 w-full rounded border border-primary bg-transparent px-3 py-2 text-sm text-primary outline-none',
              'placeholder:text-secondary',
              'hover:border-accent-primary focus:border-focus',
              'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-controls-disable disabled:text-controls-primary-disable',
              error && 'border-error hover:border-error focus:border-error',
              type === 'password' && 'pr-9',
              className,
            )}
            data-qa={dataQa}
            type={inputType}
          />

          {type === 'password' && (
            <DialButton
              className="absolute right-0 top-1/2 -translate-y-1/2 px-3 text-secondary"
              onClick={handleTogglePassword}
              iconBefore={
                isVisible ? <IconEye size={18} /> : <IconEyeOff size={18} />
              }
            />
          )}
        </div>
      </DialTooltip>
    );
  },
);
Input.displayName = 'Input';

export const Field = withErrorMessage(withLabel(Input));
